export interface BucketStruct {
  tophash: number[];
  keys: (string | null)[];
  vals: (number | null)[];
  filled: number;
}

export type BucketChain = BucketStruct[];

export interface MapState {
  B: number;
  count: number;
  noverflow: number;
  buckets: BucketChain[];
  selectedBucketIdx: number;
  selectedChainIdx: number;
}

export interface HashInfo {
  hash: number;
  hob: number;
  lob: number;
  binary: string;
}

export type ExplanationKey = 'count' | 'flags' | 'B' | 'noverflow' | 'buckets' | 'oldbuckets' | 'hash' | 'tophash' | 'keys' | 'values' | 'overflow';
