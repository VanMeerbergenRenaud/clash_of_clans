<script setup lang="ts">
const props = defineProps<{
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}>()

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-indigo-100 text-indigo-700'
}
</script>

<template>
  <span 
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="variants[variant || 'default']"
  >
    <slot />
  </span>
</template>
