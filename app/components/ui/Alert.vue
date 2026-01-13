<script setup lang="ts">
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  title?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}>(), {
  variant: 'default'
})

const icon = computed(() => {
  switch (props.variant) {
    case 'destructive': return XCircle
    case 'success': return CheckCircle2
    case 'warning': return AlertCircle
    default: return Info
  }
})

const styles = computed(() => {
  switch (props.variant) {
    case 'destructive':
      return 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/10 dark:text-red-200 dark:border-red-900/50'
    case 'success':
      return 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/10 dark:text-green-200 dark:border-green-900/50'
    case 'warning':
      return 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/10 dark:text-amber-200 dark:border-amber-900/50'
    default:
      return 'bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-900/10 dark:text-indigo-200 dark:border-indigo-900/50'
  }
})

const iconColor = computed(() => {
  switch (props.variant) {
    case 'destructive': return 'text-red-600 dark:text-red-400'
    case 'success': return 'text-green-600 dark:text-green-400'
    case 'warning': return 'text-amber-600 dark:text-amber-400'
    default: return 'text-indigo-600 dark:text-indigo-400'
  }
})
</script>

<template>
  <div :class="['relative w-full rounded-lg border p-4 flex gap-3', styles]">
    <component :is="icon" :class="['h-5 w-5 shrink-0 mt-0.5', iconColor]" />
    <div class="flex-1">
      <h5 v-if="title" class="mb-1 font-medium leading-none tracking-tight">
        {{ title }}
      </h5>
      <div class="text-sm opacity-90">
        <slot />
      </div>
    </div>
  </div>
</template>
