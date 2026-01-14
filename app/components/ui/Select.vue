<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

defineProps<{
  label?: string
  modelValue: string | number
  options: { label: string; value: string | number }[] | (string | number)[]
  error?: string
}>()

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-xs font-bold text-slate-400 uppercase tracking-widest">
      {{ label }}
    </label>
    <div class="relative">
      <select
        :value="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        class="block w-full appearance-none rounded-xl border border-slate-200 bg-white text-slate-900 px-4 py-2.5 text-sm focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none cursor-pointer"
        :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': error }"
      >
        <option 
          v-for="option in options" 
          :key="typeof option === 'object' ? option.value : option" 
          :value="typeof option === 'object' ? option.value : option"
        >
          {{ typeof option === 'object' ? option.label : option }}
        </option>
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <ChevronDown class="w-4 h-4 text-slate-400" />
      </div>
    </div>
    <p v-if="error" class="text-xs text-red-600 font-medium">{{ error }}</p>
  </div>
</template>
