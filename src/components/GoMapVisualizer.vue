<script setup lang="ts">
import { ref, computed } from 'vue';
import type { BucketStruct, BucketChain, ExplanationKey, HashInfo } from '../types';

// State
const B = ref(2);
const count = ref(0);
const noverflow = ref(0);
const buckets = ref<BucketChain[]>([]);
const selectedBucketIdx = ref(0);
const selectedChainIdx = ref(0);
const infoText = ref<string>('Hover over the map components to see how they work.');
const infoIsHtml = ref(false);
const logs = ref<string[]>(['> System ready. Map initialized with B=2 (4 buckets).']);
const lastHash = ref<HashInfo | null>(null);
const oldBucketsPtr = ref('nil');

// Explanations
const explanations: Record<ExplanationKey, string> = {
  count: '<strong>Count:</strong> Total number of live items in the map.',
  flags: '<strong>Flags:</strong> Tracks state like \'writing\' (panic on concurrent write) or \'iterator active\'.',
  B: '<strong>B:</strong> Log_2 of buckets. 2^B = Total Buckets. Determines mask for LOB.',
  noverflow: '<strong>NOverflow:</strong> Approximate count of overflow buckets created.',
  buckets: '<strong>Buckets Pointer:</strong> Points to the start of the contiguous bucket array in memory.',
  oldbuckets: '<strong>OldBuckets:</strong> Non-nil only during growth. Points to the old array while data is evacuated.',
  hash: '<strong>Hash Split:</strong> High bits (HOB) become Tophash. Low bits (LOB) determine the Bucket Index.',
  tophash: '<strong>Tophash Array:</strong> First 8 bytes. CPU checks this first. If byte doesn\'t match, it skips the key (Fast Fail).',
  keys: '<strong>Keys Array:</strong> Stored together to eliminate padding. e.g. int8 keys next to int8 keys.',
  values: '<strong>Values Array:</strong> Stored after keys.',
  overflow: '<strong>Overflow Pointer:</strong> Links to the next bucket if this one is full (Chaining).'
};

// Computed
const loadFactor = computed(() => (count.value / (1 << B.value)).toFixed(2));

const selectedBucket = computed(() => {
  const chain = buckets.value[selectedBucketIdx.value];
  return chain ? chain[selectedChainIdx.value] : null;
});

const hasOverflow = computed(() => {
  const chain = buckets.value[selectedBucketIdx.value];
  return chain && chain[selectedChainIdx.value + 1];
});

// Methods
function createBucketStruct(): BucketStruct {
  return {
    tophash: new Array(8).fill(0),
    keys: new Array(8).fill(null),
    vals: new Array(8).fill(null),
    filled: 0
  };
}

function createBuckets(num: number) {
  buckets.value = [];
  for (let i = 0; i < num; i++) {
    buckets.value.push([createBucketStruct()]);
  }
}

function initMap() {
  count.value = 0;
  noverflow.value = 0;
  createBuckets(1 << B.value);
  log('Map Reset.');
}

function log(msg: string) {
  logs.value.push(`> ${msg}`);
}

function explain(key: ExplanationKey) {
  infoText.value = explanations[key];
  infoIsHtml.value = true;
}

function resetExplain() {
  infoText.value = 'Hover over the map components to see how they work.';
  infoIsHtml.value = false;
}

function updateHashVisual(hash: number, b: number, hob: number, lob: number) {
  const bin = hash.toString(2).padStart(16, '0');
  lastHash.value = { hash, hob, lob, binary: bin };
}

function put(key: string, val: number, forceZero = false) {
  const numBuckets = 1 << B.value;
  let hash = 0;

  if (forceZero) {
    hash = 0x100;
  } else {
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
    }
    hash = Math.abs(hash);
  }

  const lob = hash & (numBuckets - 1);
  let hob = (hash >> 8) & 0xFF;
  if (hob < 5) hob = 5;

  updateHashVisual(hash, B.value, hob, lob);

  let chain = buckets.value[lob];
  let inserted = false;

  for (let cIdx = 0; cIdx < chain.length; cIdx++) {
    let b = chain[cIdx];
    for (let i = 0; i < 8; i++) {
      if (b.keys[i] === null) {
        b.keys[i] = key;
        b.vals[i] = val;
        b.tophash[i] = hob;
        b.filled++;
        count.value++;
        inserted = true;
        log(`Put(${key}): Bucket [${lob}], Slot [${i}]`);
        selectBucket(lob, cIdx);
        break;
      }
    }
    if (inserted) break;
  }

  if (!inserted) {
    log(`Bucket [${lob}] Full. Creating Overflow.`);
    const newB = createBucketStruct();
    newB.keys[0] = key;
    newB.vals[0] = val;
    newB.tophash[0] = hob;
    newB.filled++;
    chain.push(newB);
    count.value++;
    noverflow.value++;
    selectBucket(lob, chain.length - 1);
  }
}

function insertAction() {
  const key = 'k-' + Math.floor(Math.random() * 1000);
  const val = Math.floor(Math.random() * 100);
  put(key, val);
}

function insertSpecific() {
  const key = 'F-' + Math.floor(Math.random() * 100);
  put(key, 999, true);
}

function deleteAction() {
  if (count.value === 0) return;

  for (let i = 0; i < buckets.value.length; i++) {
    for (let c = 0; c < buckets.value[i].length; c++) {
      let b = buckets.value[i][c];
      if (b.filled > 0) {
        for (let k = 7; k >= 0; k--) {
          if (b.keys[k] !== null) {
            log(`Deleted ${b.keys[k]}`);
            b.keys[k] = null;
            b.vals[k] = null;
            b.tophash[k] = 0;
            b.filled--;
            count.value--;
            selectBucket(i, c);
            return;
          }
        }
      }
    }
  }
}

function growAction() {
  log('--- EVACUATION TRIGGERED ---');
  const oldBuckets = buckets.value;
  B.value++;
  count.value = 0;
  noverflow.value = 0;
  createBuckets(1 << B.value);

  oldBuckets.forEach(chain => {
    chain.forEach(b => {
      for (let i = 0; i < 8; i++) {
        if (b.keys[i] !== null) {
          put(b.keys[i]!, b.vals[i]!);
        }
      }
    });
  });

  oldBucketsPtr.value = '0xPTR (Evacuating...)';
  setTimeout(() => oldBucketsPtr.value = 'nil', 2000);
  log(`Growth Complete. B=${B.value}`);
}

function resetMap() {
  B.value = 2;
  oldBucketsPtr.value = 'nil';
  logs.value = [];
  lastHash.value = null;
  initMap();
}

function selectBucket(bIdx: number, cIdx: number) {
  selectedBucketIdx.value = bIdx;
  selectedChainIdx.value = cIdx;
}

const hashDisplayParts = computed(() => {
  if (!lastHash.value) {
    return null;
  }

  const bin = lastHash.value.binary;
  const len = bin.length;
  const b = B.value;
  const lobStr = bin.slice(len - b);
  const hobStr = bin.slice(len - b - 8, len - b);
  const rest = bin.slice(0, len - b - 8);

  return {
    rest,
    hob: hobStr,
    lob: lobStr
  };
});

// Initialize on mount
initMap();
</script>

<template>
  <div class="flex flex-col items-center p-5">
    <!-- Info Panel -->
    <div
      class="w-full max-w-[1200px] bg-[#333] text-white px-4 py-4 rounded-lg min-h-[50px] flex items-center justify-center text-center text-lg shadow-md sticky top-0 z-[100] mb-5"
    >
      <span v-if="infoIsHtml" v-html="infoText"></span>
      <span v-else>{{ infoText }}</span>
    </div>

    <!-- Controls -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-5 flex gap-2.5 flex-wrap justify-center border-t-4 border-[var(--go-blue)]">
      <button
        class="px-5 py-2.5 border-none rounded cursor-pointer font-bold text-white text-sm bg-[#2e7d32] active:scale-95 transition-transform"
        @click="insertAction"
      >
        Insert Random Key
      </button>
      <button
        class="px-5 py-2.5 border-none rounded cursor-pointer font-bold text-white text-sm bg-[#0277bd] active:scale-95 transition-transform"
        @click="insertSpecific"
      >
        Force Overflow (Bucket 0)
      </button>
      <button
        class="px-5 py-2.5 border-none rounded cursor-pointer font-bold text-white text-sm bg-[#c62828] active:scale-95 transition-transform"
        @click="deleteAction"
      >
        Delete Random Key
      </button>
      <button
        class="px-5 py-2.5 border-none rounded cursor-pointer font-bold text-white text-sm bg-[var(--go-black)] active:scale-95 transition-transform"
        @click="growAction"
      >
        Force Growth
      </button>
      <button
        class="px-5 py-2.5 border-none rounded cursor-pointer font-bold text-white text-sm bg-[#757575] active:scale-95 transition-transform"
        @click="resetMap"
      >
        Reset Map
      </button>
    </div>

    <!-- Main Container -->
    <div class="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 max-w-[1300px] w-full">

      <!-- Left: HMAP Struct -->
      <div>
        <div class="bg-white border-2 border-[var(--go-black)] rounded-lg overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,0.1)]">
          <div class="bg-[var(--go-black)] text-white p-2.5 font-bold text-center">
            hmap (Runtime Header)
          </div>

          <div
            class="flex justify-between px-4 py-2.5 border-b border-gray-200 cursor-help transition-colors hover:bg-[var(--highlight)]"
            @mouseover="explain('count')"
            @mouseout="resetExplain()"
          >
            <span>count</span>
            <span class="font-mono font-bold text-[var(--go-blue)]">{{ count }}</span>
          </div>

          <div
            class="flex justify-between px-4 py-2.5 border-b border-gray-200 cursor-help transition-colors hover:bg-[var(--highlight)]"
            @mouseover="explain('flags')"
            @mouseout="resetExplain()"
          >
            <span>flags</span>
            <span class="font-mono font-bold text-[var(--go-blue)]">0</span>
          </div>

          <div
            class="flex justify-between px-4 py-2.5 border-b border-gray-200 cursor-help transition-colors hover:bg-[var(--highlight)]"
            @mouseover="explain('B')"
            @mouseout="resetExplain()"
          >
            <span>B (log_2 buckets)</span>
            <span class="font-mono font-bold text-[var(--go-blue)]">{{ B }}</span>
          </div>

          <div
            class="flex justify-between px-4 py-2.5 border-b border-gray-200 cursor-help transition-colors hover:bg-[var(--highlight)]"
            @mouseover="explain('noverflow')"
            @mouseout="resetExplain()"
          >
            <span>noverflow</span>
            <span class="font-mono font-bold text-[var(--go-blue)]">{{ noverflow }}</span>
          </div>

          <div
            class="flex justify-between px-4 py-2.5 border-b border-gray-200 cursor-help transition-colors hover:bg-[var(--highlight)]"
            @mouseover="explain('buckets')"
            @mouseout="resetExplain()"
          >
            <span>buckets</span>
            <span class="font-mono font-bold text-[var(--go-blue)]">0x204..</span>
          </div>

          <div
            class="flex justify-between px-4 py-2.5 cursor-help transition-colors hover:bg-[var(--highlight)]"
            @mouseover="explain('oldbuckets')"
            @mouseout="resetExplain()"
          >
            <span>oldbuckets</span>
            <span class="font-mono font-bold text-[var(--go-blue)]">{{ oldBucketsPtr }}</span>
          </div>
        </div>

        <div class="mt-2.5 text-sm text-gray-600 text-center">
          Load Factor: <span class="font-bold">{{ loadFactor }}</span><br>
          (Grows > 6.5)
        </div>
      </div>

      <!-- Right Column -->
      <div class="flex flex-col gap-5">

        <!-- Hash Visualizer -->
        <div
          class="bg-white p-4 border border-dashed border-gray-300 rounded-md flex items-center flex-wrap gap-2.5 font-mono"
          @mouseover="explain('hash')"
          @mouseout="resetExplain()"
        >
          <div class="font-bold text-[#333] font-sans">Last Key Hash:</div>
          <div class="text-lg tracking-wide">
            <template v-if="hashDisplayParts">
              <span class="text-gray-400">..{{ hashDisplayParts.rest }}</span>
              <span class="bit-hob">{{ hashDisplayParts.hob }}</span>
              <span class="bit-lob">{{ hashDisplayParts.lob }}</span>
            </template>
            <span v-else class="text-gray-400">Waiting for input...</span>
          </div>
          <div class="ml-auto font-sans text-xs text-gray-600">
            <span style="color:var(--accent)">■ HOB (Tophash)</span> &nbsp;
            <span style="color:var(--go-blue)">■ LOB (Bucket Idx)</span>
          </div>
        </div>

        <!-- Buckets Grid -->
        <div class="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
          <div
            v-for="(chain, bIdx) in buckets"
            :key="bIdx"
            class="flex flex-col items-center gap-1.5"
          >
            <template v-for="(bucket, cIdx) in chain" :key="`${bIdx}-${cIdx}`">
              <div v-if="cIdx > 0" class="overflow-link"></div>
              <div
                class="w-[100px] bg-white border-2 border-gray-300 rounded-md p-2 cursor-pointer transition-all hover:border-[var(--go-blue)] hover:-translate-y-0.5 hover:shadow-md"
                :class="{
                  'selected border-[var(--go-blue)] bg-[#e1f5fe] scale-105 shadow-[0_0_0_3px_rgba(0,173,216,0.3)]': bIdx === selectedBucketIdx && cIdx === selectedChainIdx,
                  'overflow border-[var(--overflow)] bg-[#fff8e1]': cIdx > 0
                }"
                @click="selectBucket(bIdx, cIdx)"
              >
                <div class="text-xs text-center mb-1.5 text-gray-600 font-bold">
                  {{ cIdx === 0 ? `Bucket ${bIdx}` : 'Overflow' }}
                </div>
                <div class="grid grid-cols-4 gap-[3px]">
                  <div
                    v-for="i in 8"
                    :key="i"
                    class="slot-dot"
                    :class="{ filled: bucket.keys[i - 1] !== null }"
                  ></div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- X-Ray Container -->
      <div class="col-span-1 md:col-span-2 bg-white border-2 border-[var(--go-blue)] rounded-lg p-5 mt-5 fade-in">
        <h3 class="mt-0 mb-1.5 text-[var(--go-blue)]">
          Memory Layout: Bucket {{ selectedBucketIdx }} {{ selectedChainIdx > 0 ? '(Overflow)' : '' }}
        </h3>
        <p class="m-0 mb-2.5 text-sm text-gray-600">
          Go organizes memory as Struct{ Tophash[8], Keys[8], Values[8] } to avoid padding bytes.
        </p>

        <div class="flex gap-1 mt-4 overflow-x-auto">
          <!-- Tophash -->
          <div
            class="border border-[#999] flex-1 min-w-[120px] tophash-blk"
            @mouseover="explain('tophash')"
            @mouseout="resetExplain()"
          >
            <div class="text-xs uppercase tracking-wide p-1.5 text-center border-b border-black/10 font-bold">
              tophash [8]
            </div>
            <div v-if="selectedBucket">
              <div
                v-for="i in 8"
                :key="i"
                class="border-b border-black/10 p-1 font-mono text-sm text-center h-5 whitespace-nowrap overflow-hidden text-ellipsis last:border-b-0"
                :class="selectedBucket.keys[i - 1] !== null ? 'filled font-bold text-[#202224]' : 'empty text-gray-400 italic'"
              >
                {{ selectedBucket.keys[i - 1] !== null ? '0x' + selectedBucket.tophash[i - 1].toString(16).toUpperCase() : '0' }}
              </div>
            </div>
          </div>

          <!-- Keys -->
          <div
            class="border border-[#999] flex-1 min-w-[120px] key-blk"
            @mouseover="explain('keys')"
            @mouseout="resetExplain()"
          >
            <div class="text-xs uppercase tracking-wide p-1.5 text-center border-b border-black/10 font-bold">
              keys [8]
            </div>
            <div v-if="selectedBucket">
              <div
                v-for="i in 8"
                :key="i"
                class="border-b border-black/10 p-1 font-mono text-sm text-center h-5 whitespace-nowrap overflow-hidden text-ellipsis last:border-b-0"
                :class="selectedBucket.keys[i - 1] !== null ? 'filled font-bold text-[#202224]' : 'empty text-gray-400 italic'"
              >
                {{ selectedBucket.keys[i - 1] ?? 'nil' }}
              </div>
            </div>
          </div>

          <!-- Values -->
          <div
            class="border border-[#999] flex-1 min-w-[120px] val-blk"
            @mouseover="explain('values')"
            @mouseout="resetExplain()"
          >
            <div class="text-xs uppercase tracking-wide p-1.5 text-center border-b border-black/10 font-bold">
              values [8]
            </div>
            <div v-if="selectedBucket">
              <div
                v-for="i in 8"
                :key="i"
                class="border-b border-black/10 p-1 font-mono text-sm text-center h-5 whitespace-nowrap overflow-hidden text-ellipsis last:border-b-0"
                :class="selectedBucket.keys[i - 1] !== null ? 'filled font-bold text-[#202224]' : 'empty text-gray-400 italic'"
              >
                {{ selectedBucket.vals[i - 1] ?? 'nil' }}
              </div>
            </div>
          </div>

          <!-- Overflow -->
          <div
            class="border border-[#999] flex-1 min-w-[120px] overflow-blk"
            @mouseover="explain('overflow')"
            @mouseout="resetExplain()"
          >
            <div class="text-xs uppercase tracking-wide p-1.5 text-center border-b border-black/10 font-bold">
              overflow *
            </div>
            <div class="p-1 font-mono text-center pt-10 text-2xl">
              {{ hasOverflow ? '→' : 'nil' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Log Window -->
      <div class="col-span-2 bg-[#202224] text-[#00ff00] font-mono p-4 h-[120px] overflow-y-auto rounded mt-2.5 text-sm">
        <div v-for="(log, idx) in logs" :key="idx">{{ log }}</div>
      </div>

    </div>
  </div>
</template>
