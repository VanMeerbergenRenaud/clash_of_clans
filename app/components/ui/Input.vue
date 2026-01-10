<script setup lang="ts">
defineProps<{
  label?: string
  modelValue: string | number
  type?: string
  placeholder?: string
  error?: string
  icon?: any
}>()

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ label }}
    </label>
    <div class="relative">
      <div v-if="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <component :is="icon" class="h-5 w-5 text-slate-400" />
      </div>
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :type="type || 'text'"
        :placeholder="placeholder"
        class="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2.5 transition-colors"
        :class="{ 
          'pl-10': icon,
          'border-red-300 focus:border-red-500 focus:ring-red-500': error
        }"
      />
    </div>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>
