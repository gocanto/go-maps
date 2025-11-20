<script setup lang="ts">
import GoMapVisualizer from './components/GoMapVisualizer.vue'
import InfoPanel from './components/InfoPanel.vue'
</script>

<template>
  <div class="flex min-h-screen bg-gray-100 gap-6">
    <!-- Left Container: Map Visualizer -->
    <div class="flex-1">
      <GoMapVisualizer />
    </div>

    <!-- Right Container: Text Content -->
    <InfoPanel />
  </div>
</template>
