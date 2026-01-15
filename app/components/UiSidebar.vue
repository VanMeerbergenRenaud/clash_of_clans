
<script setup lang="ts">
import { 
  Home, 
  Shield, 
  Swords, 
  Map, 
  Layers, 
  ChevronsUpDown,
  User,
  LogOut,
  Sparkles,
  CreditCard,
  Bell,
  Settings,
  CircleUser,
  MessageCircle
} from 'lucide-vue-next'

const { isExpanded, isMobileOpen, closeMobileSidebar } = useSidebar()
const route = useRoute()

// App Logo (using a placeholder icon since no file was provided)
const appName = "CoC Manager"

// Grouped Navigation
const navGroups = [
  {
    title: 'Organisation',
    items: [
      { name: 'Tableau de bord', path: '/', icon: Home },
      { name: 'Ligues de clan', path: '/leagues', icon: Shield },
      { name: 'Guerres de clan', path: '/wars', icon: Swords },
    ]
  },
  {
    title: 'Communauté',
    items: [
      { name: 'Bases de défense', path: '/bases', icon: Map },
      { name: 'Stratégies d\'attaque', path: '/strategies', icon: Layers },
    ]
  }
]

// Mock User Data
const user = {
  name: 'PaDaWaN',
  email: 'padawan.coc@example.com',
  avatar: 'https://github.com/shadcn.png'
}

// User Menu State
const isUserMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// Close menu when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
      isUserMenuOpen.value = false
    }
  })
})

const toggleUserMenu = (e: Event) => {
  e.stopPropagation() // Prevent immediate closing
  isUserMenuOpen.value = !isUserMenuOpen.value
}
</script>

<template>
  <div>
    <!-- Mobile Overlay -->
    <div 
      v-if="isMobileOpen" 
      class="fixed inset-0 bg-black/80 z-40 lg:hidden"
      @click="closeMobileSidebar"
    ></div>

    <!-- Sidebar Container -->
    <aside 
      class="fixed lg:sticky top-0 left-0 z-50 h-screen bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col"
      :class="[
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isExpanded ? 'lg:w-[260px]' : 'lg:w-[70px]',
        'w-[260px]'
      ]"
    >
      <!-- App Header / Logo -->
      <div class="h-16 flex items-center px-4 border-b border-slate-200/50">
        <a href="/" class="flex items-center gap-2 p-2 w-full hover:bg-slate-100 rounded-lg transition-colors">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shrink-0 shadow-sm shadow-indigo-200">
             <!-- Placeholder Logo Icon -->
             <span class="font-bold text-lg">C</span>
          </div>
          <div 
            class="flex flex-col items-start overflow-hidden transition-all duration-300"
             :class="isExpanded ? 'opacity-100 w-auto ml-1' : 'opacity-0 w-0 -ml-2 pointer-events-none lg:hidden'"
          >
            <span class="font-semibold text-slate-900 leading-none tracking-tight">{{ appName }}</span>
            <span class="text-xs text-slate-500 mt-1">Enterprise</span>
          </div>
        </a>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar space-y-6">
        <div v-for="(group, idx) in navGroups" :key="idx">
          <h3 
            v-if="isExpanded && group.title"
            class="px-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider transition-opacity duration-300"
          >
            {{ group.title }}
          </h3>
           <!-- Separator for collapsed state instead of title -->
          <div v-else-if="!isExpanded && group.title" class="my-4 border-t border-slate-200 mx-2"></div>

          <ul class="space-y-1">
            <li v-for="link in group.items" :key="link.path">
              <NuxtLink 
                :to="link.path"
                class="flex items-center gap-3 rounded-md transition-all duration-200 group relative"
                :class="[
                  isExpanded ? 'px-3 py-2' : 'justify-center p-2',
                  'hover:bg-slate-200/50 text-slate-600 hover:text-slate-900'
                ]"
                active-class="bg-slate-200 text-slate-900 font-medium"
                @click="closeMobileSidebar"
              >
                <component 
                  :is="link.icon" 
                  class="w-4 h-4 shrink-0 transition-colors"
                />
                
                <span 
                  class="text-sm transition-all duration-300 origin-left whitespace-nowrap"
                  :class="isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden lg:hidden'"
                >
                  {{ link.name }}
                </span>

                 <!-- Tooltip for collapsed state -->
                <div 
                  v-if="!isExpanded"
                  class="hidden lg:block absolute left-full ml-2 px-2 py-1 bg-slate-900 text-slate-50 text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50 animate-in fade-in slide-in-from-left-1"
                >
                  {{ link.name }}
                </div>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>

      <!-- User Profile & Footer -->
      <div 
        class="p-4 border-t border-slate-200/50 mt-auto relative" 
        ref="userMenuRef"
      >
        <!-- Dropdown Menu -->
        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div 
            v-if="isUserMenuOpen"
            class="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-w-[220px]"
            :class="isExpanded ? '' : 'left-full ml-2 bottom-0'" 
          >
             <!-- Menu Items -->
             <div class="p-1">
               <button class="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                   <CircleUser class="w-4 h-4 text-slate-500" />
                   <span>Mon compte</span>
               </button>
               <button class="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                   <MessageCircle class="w-4 h-4 text-slate-500" />
                   <span>Contacter l'admin</span>
               </button>
             </div>

             <div class="h-px bg-slate-100 my-1"></div>

             <div class="p-1">
                <button class="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors group/logout">
                   <LogOut class="w-4 h-4 text-slate-500 group-hover/logout:text-slate-900" />
                   <span>Se déconnecter</span>
                </button>
             </div>
          </div>
        </transition>

        <!-- Profile Trigger -->
        <button 
          class="w-full flex items-center gap-3 rounded-lg hover:bg-slate-200/50 transition-colors p-2 cursor-pointer group outline-none"
          :class="[
            isExpanded ? '' : 'justify-center',
            isUserMenuOpen ? 'bg-slate-200/50' : ''
          ]"
          @click="toggleUserMenu"
        >
          <div class="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
             <div class="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold" v-if="!user.avatar">S</div>
             <img v-else :src="user.avatar" alt="User" class="w-full h-full object-cover" />
          </div>
          
          <div 
            class="flex flex-col items-start overflow-hidden transition-all duration-300 text-left"
            :class="isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 pointer-events-none lg:hidden'"
          >
            <span class="font-medium text-sm text-slate-900 leading-none truncate w-32">{{ user.name }}</span>
            <span class="text-xs text-slate-500 truncate w-32">{{ user.email }}</span>
          </div>
           <ChevronsUpDown 
             class="ml-auto w-4 h-4 text-slate-400 shrink-0 transition-opacity duration-300 group-hover:text-slate-600" 
             :class="isExpanded ? 'opacity-100' : 'opacity-0 lg:hidden'"
          />
        </button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 0px;
}
.router-link-active {
  background-color: rgb(226 232 240); /* slate-200 */
  color: rgb(15 23 42); /* slate-900 */
}
</style>
