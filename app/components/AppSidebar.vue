
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
  MessageCircle,
  X,
  Scroll,
  LogIn
} from 'lucide-vue-next'

const { isExpanded, isMobileOpen, closeMobileSidebar } = useSidebar()
const { user, userProfile, isAuthenticated, canAccessInscriptions, logout } = useUserRole()
const route = useRoute()

// App Logo (using a placeholder icon since no file was provided)
const appName = "CoC Manager"

// Base navigation structure
const baseNavGroups = [
  {
    title: '',
    items: [
      { name: 'Tableau de bord', path: '/', icon: Home },
    ]
  },
  {
    title: 'Organisation',
    items: [
      { name: 'Inscriptions', path: '/inscription', icon: Scroll, requiresAdmin: true },
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

// Filtered navigation based on user role
const navGroups = computed(() => {
  return baseNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // If item requires admin/editor access, check permission
      if (item.requiresAdmin) {
        return canAccessInscriptions.value
      }
      return true
    })
  })).filter(group => group.items.length > 0)
})

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

const handleLogout = async () => {
  isUserMenuOpen.value = false
  await logout()
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
      class="fixed lg:sticky top-0 left-0 z-50 lg:z-20 h-screen bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col"
      :class="[
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isExpanded ? 'lg:w-[260px]' : 'lg:w-[70px]',
        'w-full'
      ]"
    >
      <!-- App Header / Logo -->
      <div class="h-16 flex items-center px-4 border-b border-slate-200/50 justify-between gap-2">
        <a href="/" 
           class="flex items-center gap-2 hover:bg-slate-100 rounded-lg transition-colors overflow-hidden"
           :class="[
             isExpanded ? 'p-2 flex-1' : 'p-1',
           ]"
        >
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shrink-0 shadow-sm shadow-indigo-200">
             <!-- Placeholder Logo Icon -->
             <span class="font-bold text-lg">C</span>
          </div>
          <div 
            class="flex flex-col items-start overflow-hidden transition-all duration-300"
             :class="(isExpanded || isMobileOpen) ? 'opacity-100 w-auto ml-1' : 'opacity-0 w-0 -ml-2 pointer-events-none lg:hidden'"
          >
            <span class="font-semibold text-slate-900 leading-none tracking-tight">{{ appName }}</span>
            <span class="text-xs text-slate-500 mt-1">Créé par PaDaWaN</span>
          </div>
        </a>

        <!-- Close Button (Mobile Only) -->
        <button 
          v-if="isMobileOpen"
          @click="closeMobileSidebar"
          class="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Navigation -->
      <nav 
        class="flex-1 py-6 px-3 custom-scrollbar space-y-6"
        :class="isExpanded ? 'overflow-y-auto' : 'overflow-visible'"
      >
        <div v-for="(group, idx) in navGroups" :key="idx">
          <h3 
            v-if="(isExpanded || isMobileOpen) && group.title"
            class="px-2 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider transition-opacity duration-300"
          >
            {{ group.title }}
          </h3>
           <!-- Separator for collapsed state instead of title -->
          <div v-else-if="!isExpanded && !isMobileOpen && group.title" class="my-4 border-t border-slate-200 mx-2"></div>

          <ul class="space-y-1">
            <li v-for="link in group.items" :key="link.path">
              <NuxtLink 
                :to="link.path"
                class="flex items-center gap-3 rounded-md transition-all duration-200 group relative"
                :class="[
                  (isExpanded || isMobileOpen) ? 'px-3 py-2' : 'justify-center p-2',
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
                  :class="(isExpanded || isMobileOpen) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden lg:hidden'"
                >
                  {{ link.name }}
                </span>

                 <!-- Tooltip for collapsed state -->
                <div 
                  v-if="!isExpanded && !isMobileOpen"
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
        <!-- Dropdown Menu (only if authenticated) -->
        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div 
            v-if="isUserMenuOpen && isAuthenticated"
            class="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-w-[220px] z-50"
          >
             <!-- Menu Items -->
             <div class="p-1">
               <a href="https://link.clashofclans.com/fr?action=OpenPlayerProfile&tag=PUQLYCR0" target="_blank" class="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                   <CircleUser class="w-4 h-4 text-slate-500" />
                   <span>Compte du créateur</span>
               </a>
               <a href="mailto:padawan.coc@gmail.com" class="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                   <MessageCircle class="w-4 h-4 text-slate-500" />
                   <span>Contacter le créateur</span>
               </a>
             </div>

             <div class="h-px bg-slate-100 my-1"></div>

             <div class="p-1">
                <button 
                  @click="handleLogout"
                  class="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors group/logout"
                >
                   <LogOut class="w-4 h-4 text-slate-500 group-hover/logout:text-slate-900" />
                   <span>Se déconnecter</span>
                </button>
             </div>
          </div>
        </transition>

        <!-- Profile Trigger (if authenticated) -->
        <button 
          v-if="isAuthenticated"
          class="w-full flex items-center gap-3 rounded-lg hover:bg-slate-200/50 transition-colors p-2 cursor-pointer group outline-none"
          :class="[
            (isExpanded || isMobileOpen) ? '' : 'justify-center',
            isUserMenuOpen ? 'bg-slate-200/50' : ''
          ]"
          @click="toggleUserMenu"
        >
          <div class="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
              <img src="/img/avatar.png" class="w-full h-full object-cover" alt="User Avatar" />
          </div>
          
          <div 
            class="flex flex-col items-start overflow-hidden transition-all duration-300 text-left"
            :class="(isExpanded || isMobileOpen) ? 'opacity-100 w-auto' : 'opacity-0 w-0 pointer-events-none lg:hidden'"
          >
            <span class="font-medium text-sm text-slate-900 leading-none truncate w-32">{{ userProfile?.username || user?.email?.split('@')[0] || 'Utilisateur' }}</span>
            <span class="text-xs text-slate-500 truncate w-32">{{ user?.email || '' }}</span>
          </div>
           <ChevronsUpDown 
             class="ml-auto w-4 h-4 text-slate-400 shrink-0 transition-opacity duration-300 group-hover:text-slate-600" 
             :class="(isExpanded || isMobileOpen) ? 'opacity-100' : 'opacity-0 lg:hidden'"
          />
        </button>

        <!-- Login Button (if not authenticated) -->
        <NuxtLink 
          v-else
          to="/login"
          class="w-full flex items-center gap-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors p-2 cursor-pointer group"
          :class="(isExpanded || isMobileOpen) ? '' : 'justify-center'"
        >
          <LogIn class="w-4 h-4 shrink-0" />
          <span 
            class="text-sm font-medium transition-all duration-300"
            :class="(isExpanded || isMobileOpen) ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden lg:hidden'"
          >
            Se connecter
          </span>
        </NuxtLink>
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
