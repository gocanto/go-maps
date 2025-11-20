<script setup lang="ts">
import TextContent from './TextContent.vue'

const content = `
This is a simulation of the **Go Runtime Map (\`hmap\`)**, visualizing how the language manages memory, hashing, and collisions under the hood.

### Key Behaviors

- **The Bucket Structure:** Unlike generic hash maps that store one item per node, Go uses **Buckets**. Each bucket is a fixed-size memory block holding exactly **8 key/value pairs**.
- **Memory Layout:** Inside a bucket, data is packed as \`[8 Tophashes] + [8 Keys] + [8 Values]\`. This structure eliminates padding bytes between keys and values, optimizing CPU cache locality.

- **Smart Hashing:** The hash is split in two:
    - **Low Bits (LOB):** Determine _which bucket_ to use.
    - **High Bits (HOB):** Become the "Tophash." These are cached in the bucket header for extremely fast comparisons (fast-fail) before scanning the full key.

- **Collision Resolution:** Go uses **Chaining**. If a bucket fills up (8 items), it allocates a new "overflow bucket" and links to it, creating a linked list of blocks rather than individual nodes.
- **Growth & Evacuation:** The map grows when the average **Load Factor exceeds 6.5**. It allocates a double-sized array and incrementally "evacuates" data from old buckets to new ones to prevent "stop-the-world" latency spikes.
`
</script>

<template>
  <TextContent :content="content" title="What are we looking at?" />
</template>
