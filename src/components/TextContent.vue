<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Props {
  content: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'What are we looking at?'
})

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true
})

const sanitizedHtml = computed(() => {
  const rawHtml = marked(props.content)
  return DOMPurify.sanitize(rawHtml)
})
</script>

<template>
  <div class="w-80 bg-gray-50 border border-gray-200 rounded-lg p-6 overflow-y-auto">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">{{ title }}</h2>
    <div
      class="text-gray-700 space-y-4 prose prose-sm max-w-none"
      v-html="sanitizedHtml"
    />
  </div>
</template>

<style scoped>
@reference "../style.css";

/* Custom prose styles for markdown content */
:deep(p) {
  @apply text-sm leading-relaxed mb-4;
}

:deep(h3) {
  @apply font-semibold text-lg mb-2 pt-4 border-t border-gray-300;
}

:deep(ul) {
  @apply text-sm space-y-2 list-disc list-inside;
}

:deep(li) {
  @apply text-sm;
}

:deep(code) {
  @apply bg-gray-200 px-1 py-0.5 rounded text-xs font-mono;
}

:deep(pre) {
  @apply bg-gray-800 text-white p-4 rounded overflow-x-auto mb-4;
}

:deep(pre code) {
  @apply bg-transparent p-0;
}

:deep(a) {
  @apply text-blue-600 hover:underline;
}

:deep(strong) {
  @apply font-semibold;
}

:deep(em) {
  @apply italic;
}

:deep(blockquote) {
  @apply border-l-4 border-gray-300 pl-4 italic text-gray-600;
}
</style>
