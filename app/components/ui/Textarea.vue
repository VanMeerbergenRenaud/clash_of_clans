<script setup lang="ts">
defineProps<{
  label?: string
  modelValue: string | number
  placeholder?: string
  error?: string
  rows?: number
  required?: boolean
}>()

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm font-medium text-slate-700">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <textarea
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        :rows="rows || 4"
        :placeholder="placeholder"
        class="block w-full rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 sm:text-sm px-4 py-3 transition-all outline-none min-h-[100px] resize-y"
        :class="{ 
          'border-red-300 ring-1 ring-red-500/80 focus:border-red-500/80 focus:ring-red-500/80': error
        }"
      ></textarea>
    </div>
    <p v-if="error" class="pl-3 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
