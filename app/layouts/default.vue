<script setup lang="ts">
import { Home, Shield, Swords, Map, Layers, Menu, X } from 'lucide-vue-next'

const isSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const links = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Ligues (CWL)', path: '/leagues', icon: Shield },
  { name: 'Guerres', path: '/wars', icon: Swords },
  { name: 'Bases', path: '/bases', icon: Map },
  { name: 'Stratégies', path: '/strategies', icon: Layers },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 transition-colors duration-300">
    <!-- Mobile Header -->
    <header class="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-20">
      <div class="flex items-center gap-2 font-bold text-xl text-primary-600">
        <span>CoC Manager</span>
      </div>
      <button @click="toggleSidebar" class="p-2 hover:bg-slate-100 rounded-lg">
        <Menu v-if="!isSidebarOpen" class="w-6 h-6 text-slate-600" />
        <X v-else class="w-6 h-6 text-slate-600" />
      </button>
    </header>

    <div class="flex">
      <!-- Sidebar -->
      <aside 
        class="fixed lg:sticky top-0 left-0 z-30 w-64 h-screen bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0"
        :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >        <div class="p-6">
          <h1 class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            CoC Manager
          </h1>
        </div>

        <nav class="mt-6 px-4 space-y-2">
          <NuxtLink 
            v-for="link in links" 
            :key="link.path" 
            :to="link.path"
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
            active-class="bg-indigo-50 text-indigo-600 font-medium"
            @click="isSidebarOpen = false"
          >
            <component :is="link.icon" class="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>{{ link.name }}</span>
          </NuxtLink>
        </nav>
      </aside>

      <!-- Overlay for mobile -->
      <div 
        v-if="isSidebarOpen" 
        @click="isSidebarOpen = false"
        class="fixed inset-0 bg-black/50 lg:hidden z-20 backdrop-blur-sm"
      ></div>

      <!-- Main Content -->
      <main class="flex-1 p-4 lg:p-8 w-full max-w-7xl mx-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.router-link-active {
  @apply bg-indigo-50 text-indigo-600;
}
</style>
