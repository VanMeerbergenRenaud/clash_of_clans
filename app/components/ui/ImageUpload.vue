<script setup lang="ts">
import { Image as ImageIcon, X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: File | null
  preview: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [file: File | null]
  'update:preview': [url: string | null]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files?.[0]) {
    setFile(target.files[0])
  }
}

const setFile = (file: File) => {
  emit('update:modelValue', file)
  emit('update:preview', URL.createObjectURL(file))
}

const clearImage = () => {
  emit('update:modelValue', null)
  emit('update:preview', null)
  if (fileInput.value) fileInput.value.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file?.type.startsWith('image/')) {
    setFile(file)
  }
}
</script>

<template>
  <div class="space-y-1.5">
    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest">Image</label>
    <div 
      class="relative aspect-video rounded-2xl border overflow-hidden flex flex-col items-center justify-center bg-slate-50/50 group transition-all cursor-pointer"
      :class="[
        isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 border-dashed hover:border-emerald-500/50 hover:bg-slate-50'
      ]"
      @click="fileInput?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <!-- Preview Image -->
      <img v-if="preview" :src="preview" class="absolute inset-0 w-full h-full object-cover" />
      
      <!-- Clear Button -->
      <button 
        v-if="preview" 
        type="button"
        class="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-lg transition-colors z-10"
        @click.stop="clearImage"
      >
        <X class="w-4 h-4" />
      </button>

      <!-- Upload Placeholder -->
      <div v-if="!preview" class="flex flex-col items-center gap-2 text-slate-400">
        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
          <ImageIcon class="w-5 h-5 group-hover:text-emerald-500" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider">
          {{ isDragging ? 'Déposez l\'image ici' : 'Cliquez ou glissez une image' }}
        </span>
      </div>

      <input 
        ref="fileInput" 
        type="file" 
        class="hidden" 
        accept="image/*" 
        @change="handleFileChange" 
      />
    </div>
  </div>
</template>
