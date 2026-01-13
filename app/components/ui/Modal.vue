<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  isOpen: boolean
  title?: string
}>()

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95"
      enter-to-class="translate-y-0 opacity-100 sm:scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100 sm:scale-100"
      leave-to-class="translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95"
    >
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left shadow-xl transition-all border border-slate-200 dark:border-slate-700">
          
          <!-- Header -->
          <div class="flex items-center justify-between mb-5">
            <h3 v-if="title" class="text-lg font-bold text-slate-900 dark:text-white">
              {{ title }}
            </h3>
            <button 
              @click="$emit('close')"
              class="rounded-lg p-1 text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Content -->
          <div>
            <slot />
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
