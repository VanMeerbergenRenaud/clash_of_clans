<script setup lang="ts">
import { PanelLeft } from 'lucide-vue-next'

const { isExpanded, toggleSidebar, toggleMobileSidebar } = useSidebar()
const route = useRoute()

// Simple breadcrumb logic based on route path
const breadcrumbs = computed(() => {
  const path = route.path
  if (path === '/') return ['Tableau de bord']
  
  const routeMap: Record<string, { category: string, name: string }> = {
    'inscription': { category: 'Organisation', name: 'Inscription' },
    'leagues': { category: 'Organisation', name: 'Ligues de clan' },
    'wars': { category: 'Organisation', name: 'Guerres de clan' },
    'bases': { category: 'Communauté', name: 'Bases de défense' },
    'strategies': { category: 'Communauté', name: "Stratégies d'attaque" }
  }
  
  const segments = path.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  const info = routeMap[last]
  
  if (info) return [info.category, info.name]
  
  return ['Page', last || 'Inconnu'] 
})
</script>

<template>
  <div class="min-h-screen bg-white font-sans text-slate-900">
    <div class="flex">
      <!-- Sidebar Component -->
      <AppSidebar />

      <!-- Main Content Block -->
      <div 
        class="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        :class="isExpanded ? 'lg:pl-0' : 'lg:pl-0'"
      >
        <!-- Header with Trigger and Breadcrumbs -->
        <header class="h-16 flex items-center gap-2 px-4 lg:px-6 bg-white border-b border-slate-200 sticky top-0 z-30">
          <button 
            @click="toggleSidebar" 
            class="hidden lg:flex items-center justify-center p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
          >
            <PanelLeft class="w-5 h-5" />
          </button>
           <button 
            @click="toggleMobileSidebar" 
            class="lg:hidden flex items-center justify-center p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
          >
            <PanelLeft class="w-5 h-5" />
          </button>
          
          <div class="h-6 w-px bg-slate-200 mx-1 hidden lg:block"></div>

          <!-- Breadcrumbs -->
          <nav class="pl-1 flex items-center gap-2 text-sm text-slate-500">
             <template v-for="(item, index) in breadcrumbs" :key="index">
                <span :class="index === breadcrumbs.length - 1 ? 'text-slate-900 font-medium' : ''">
                  {{ item }}
                </span>
                <span v-if="index < breadcrumbs.length - 1" class="text-slate-400">/</span>
             </template>
          </nav>
        </header>

        <!-- Page Content -->
        <main class="flex-1 p-4 lg:p-8 w-full max-w-[1920px] mx-auto overflow-x-hidden bg-white">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<style>
/* Global styles if needed, otherwise scoped */
</style>
