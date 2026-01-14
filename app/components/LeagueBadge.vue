<script setup lang="ts">
const props = defineProps<{
  name?: string
  size?: 'sm' | 'md' | 'lg'
}>()

const leagueIcon = computed(() => {
  if (!props.name) return 'no_league'

  const n = props.name.toLowerCase()
  
  // Normalize rank (I, II, III)
  let rank = ''
  if (n.includes(' iii') || n.includes(' 3')) rank = 'III'
  else if (n.includes(' ii') || n.includes(' 2')) rank = 'II'
  else if (n.includes(' i') || n.includes(' 1')) rank = 'I'

  // Normalize name
  let base = ''
  if (n.includes('bronze')) base = 'bronze'
  else if (n.includes('argent') || n.includes('silver')) base = 'argent'
  else if (n.includes('or ') || n.includes('gold')) base = 'or'
  else if (n.includes('cristal') || n.includes('crystal')) base = 'cristal'
  else if (n.includes('master')) base = 'master'
  else if (n.includes('champion')) base = 'champion'
  else if (n.includes('titan')) base = 'titan'
  else if (n.includes('legend')) return 'legend'

  if (!base) return 'no_league'
  return `${base}${rank}`
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-6 h-6'
    case 'lg': return 'w-12 h-12'
    default: return 'w-8 h-8'
  }
})

// Dynamic import for assets in Nuxt/Vite
const assets: Record<string, any> = import.meta.glob('~/assets/img/leagues/*.{png,jpeg}', { eager: true, import: 'default' })

const iconSrc = computed(() => {
  const name = leagueIcon.value
  const path = Object.keys(assets).find(k => k.includes(`${name}.`))
  return path ? assets[path] : null
})
</script>

<template>
  <div :class="[sizeClasses, 'flex items-center justify-center shrink-0']">
    <img 
      v-if="iconSrc" 
      :src="iconSrc" 
      :alt="name" 
      class="w-full h-full object-contain"
    />
    <slot v-else name="fallback"></slot>
  </div>
</template>
