<script setup lang="ts">
const props = defineProps<{
  show: boolean
  imageUrl: string
  alt?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="show" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        @click="handleBackdropClick"
      >
        <!-- Close button -->
        <button 
          class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          @click="emit('close')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Image -->
        <img 
          :src="imageUrl" 
          :alt="alt || 'Image'" 
          class="max-w-[90vw] max-h-[90vh] w-full object-contain rounded-lg shadow-2xl"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active img,
.modal-leave-active img {
  transition: transform 0.2s ease;
}

.modal-enter-from img,
.modal-leave-to img {
  transform: scale(0.95);
}
</style>
