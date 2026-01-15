<script setup lang="ts">
import { ExternalLink, Copy, Trash2, Pencil, Image as ImageIcon } from 'lucide-vue-next'

interface Badge {
  label: string
  variant?: 'default' | 'accent'
}

interface Action {
  label?: string
  link?: string
  icon?: 'external' | 'copy' | 'delete' | 'edit'
  onClick?: () => void
}

const props = withDefaults(defineProps<{
  imageUrl?: string
  title: string
  description?: string
  date?: string
  badges?: Badge[]
  primaryAction?: Action
  secondaryAction?: Action
  adminActions?: Action[]
  variant?: 'base' | 'strategy'
}>(), {
  variant: 'base'
})

const emit = defineEmits<{
  'image-click': [url: string]
}>()

const formattedDate = computed(() => {
  if (!props.date) return null
  return new Date(props.date).toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short'
  })
})

const handleImageClick = () => {
  if (props.imageUrl) {
    emit('image-click', props.imageUrl)
  }
}
</script>

<template>
  <div class="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all duration-200">
    
    <!-- Image Area -->
    <div 
      class="aspect-[4/3] bg-slate-100 relative overflow-hidden cursor-pointer"
      @click="handleImageClick"
    >
      <img 
        v-if="imageUrl" 
        :src="imageUrl" 
        :alt="title"
        class="w-full h-full object-cover" 
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <ImageIcon class="w-10 h-10 text-slate-300" />
      </div>
      
      <!-- Hover overlay with zoom icon -->
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </div>
      </div>
      
      <!-- Badges -->
      <div v-if="badges?.length" class="absolute top-3 left-3 flex flex-wrap gap-1.5">
        <span 
          v-for="(badge, i) in badges" 
          :key="i"
          :class="[
            'text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide',
            badge.variant === 'accent' 
              ? variant === 'strategy' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-emerald-500 text-white'
              : 'bg-slate-900/70 text-white backdrop-blur-sm'
          ]"
        >
          {{ badge.label }}
        </span>
      </div>

      <!-- Admin Actions -->
      <div v-if="adminActions?.length" class="absolute top-3 right-3 flex gap-1.5">
        <button 
          v-for="(action, i) in adminActions"
          :key="i"
          class="p-1.5 bg-white/90 hover:bg-white text-slate-600 rounded-md shadow-sm transition-colors"
          :class="action.icon === 'delete' ? 'hover:text-red-500' : 'hover:text-emerald-500'"
          @click.stop="action.onClick"
        >
          <Pencil v-if="action.icon === 'edit'" class="w-3.5 h-3.5" />
          <Trash2 v-else-if="action.icon === 'delete'" class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="p-4 flex-1 flex flex-col">
      
      <!-- Header: Title + Date -->
      <div class="flex items-start justify-between gap-2 mb-1">
        <h3 class="font-semibold text-slate-900 text-sm leading-snug line-clamp-1 flex-1">
          {{ title }}
        </h3>
        <span v-if="formattedDate" class="text-[11px] text-slate-400 whitespace-nowrap">
          {{ formattedDate }}
        </span>
      </div>

      <!-- Description -->
      <p v-if="description" class="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-auto">
        {{ description }}
      </p>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100">
        <!-- Secondary Action (icon button) -->
        <button 
          v-if="secondaryAction"
          class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          :title="secondaryAction.label"
          @click="secondaryAction.onClick"
        >
          <Copy v-if="secondaryAction.icon === 'copy'" class="w-4 h-4" />
        </button>
        
        <!-- Primary Action -->
        <a 
          v-if="primaryAction?.link"
          :href="primaryAction.link" 
          target="_blank"
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            variant === 'strategy' 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          ]"
        >
          <span>{{ primaryAction.label }}</span>
          <ExternalLink class="w-3 h-3" />
        </a>
      </div>
    </div>
  </div>
</template>
