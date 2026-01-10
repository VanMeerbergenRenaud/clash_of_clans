<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
    <div v-if="title || $slots.header" class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
      <div v-if="title">
        <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ title }}</h3>
        <p v-if="description" class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ description }}</p>
      </div>
      <slot name="header" />
    </div>
    
    <div class="p-6">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50">
      <slot name="footer" />
    </div>
  </div>
</template>
