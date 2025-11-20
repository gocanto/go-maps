<script setup lang="ts">
import GoMapVisualizer from './components/GoMapVisualizer.vue'
import InfoPanel from './components/InfoPanel.vue'
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-gray-100 gap-6">
    <!-- Left Container: Map Visualizer -->
    <div class="flex-1 md:w-2/3 p-4">
        <GoMapVisualizer />
      </div>
    
      <!-- Right Container: Text Content -->
      <InfoPanel class="md:w-1/3 p-4" />  </div></template>
