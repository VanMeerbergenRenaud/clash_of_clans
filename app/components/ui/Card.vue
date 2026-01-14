<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
    <div v-if="title || $slots.header" class="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
      <div v-if="title">
        <h3 class="font-bold text-lg text-slate-900 w-max">{{ title }}</h3>
        <p v-if="description" class="text-sm text-slate-500 mt-1">{{ description }}</p>
      </div>
      <slot name="header" />
    </div>
    
    <div class="p-6">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-6 py-4 bg-slate-50 border-t border-slate-100">
      <slot name="footer" />
    </div>
  </div>
</template>
