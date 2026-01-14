<script setup lang="ts">
import { Layers, Sword, Zap, Wind, PlayCircle, ExternalLink, Plus, X, Loader2, Trash2, ChevronDown, Pencil } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'
import UiInput from '~/components/ui/Input.vue'
import UiAlert from '~/components/ui/Alert.vue'
import UiSidebar from '~/components/ui/Sidebar.vue'
import UiSelect from '~/components/ui/Select.vue'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const profile = ref<any>(null)
const strategies = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const isAdding = ref(false)
const showSidebar = ref(false)
const editingStratId = ref<string | null>(null)
const selectedType = ref('All')
const selectedTH = ref('All')
const isMounted = ref(false)

const thLevels = ['All', 18, 17, 16, 15, 14, 13]

const newStrat = ref({
  title: '',
  description: '',
  type: 'ground',
  min_town_hall: 16,
  army_link: '',
  video_url: ''
})

const types = [
  { id: 'All', icon: Layers, label: 'Tout' },
  { id: 'ground', icon: Sword, label: 'Sol' },
  { id: 'air', icon: Wind, label: 'Aérien' },
  { id: 'hybrid', icon: Zap, label: 'Hybride' }
]

const fetchProfile = async () => {
  if (!user.value?.id) return
  const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single()
  profile.value = data
}

const fetchStrategies = async () => {
  loading.value = true
  error.value = null
  try {
    const { data, error: err } = await supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (err) throw err
    strategies.value = data || []
  } catch (err: any) {
    console.error('Error fetching strategies:', err)
    error.value = err.message
  } finally {
     loading.value = false
  }
}

const isAdmin = computed(() => profile.value?.user_type === 'admin')

onMounted(async () => {
  isMounted.value = true
  await fetchProfile()
  await fetchStrategies()
})

const handleAddStrategy = async () => {
  isAdding.value = true
  try {
    if (editingStratId.value) {
      const { error: err } = await (supabase
        .from('strategies') as any)
        .update(newStrat.value)
        .eq('id', editingStratId.value)
      
      if (!err) {
        await fetchStrategies()
        closeSidebar()
      } else {
        alert(err.message)
      }
    } else {
      const { error: err } = await (supabase.from('strategies') as any).insert([newStrat.value])
      if (!err) {
        await fetchStrategies()
        closeSidebar()
      } else {
        alert(err.message)
      }
    }
  } catch (err: any) {
    console.error('Unexpected error:', err)
  } finally {
    isAdding.value = false
  }
}

const openEditSidebar = (strat: any) => {
  editingStratId.value = strat.id
  newStrat.value = {
    title: strat.title,
    description: strat.description,
    type: strat.type,
    min_town_hall: strat.min_town_hall,
    army_link: strat.army_link || '',
    video_url: strat.video_url || ''
  }
  showSidebar.value = true
}

const closeSidebar = () => {
  showSidebar.value = false
  editingStratId.value = null
  newStrat.value = { title: '', description: '', type: 'ground', min_town_hall: 16, army_link: '', video_url: '' }
}

const handleDeleteStrategy = async (id: string) => {
  if (!confirm('Supprimer cette stratégie ?')) return
  const { error: err } = await supabase.from('strategies').delete().eq('id', id)
  if (!err) {
    await fetchStrategies()
  } else {
    alert(err.message)
  }
}

const filteredStrats = computed(() => {
  if (!strategies.value) return []
  return strategies.value.filter(s => {
    const matchType = selectedType.value === 'All' || s.type === selectedType.value
    const matchTH = selectedTH.value === 'All' || Number(s.min_town_hall) === Number(selectedTH.value)
    return matchType && matchTH
  })
})
</script>

<template>
  <div class="space-y-8 pb-32">
    <!-- HEADER & FILTERS -->
    <div class="flex flex-col gap-8">
      <!-- Title & Main Actions Row -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers class="w-5 h-5" />
            </div>
            Stratégies
          </h1>
        </div>

        <div v-if="isMounted" class="flex items-center gap-3">
          <!-- TH Select Dropdown -->
          <div class="relative">
            <select 
              v-model="selectedTH" 
              class="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-sm font-bold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[120px]"
            >
              <option v-for="th in thLevels" :key="th" :value="th">
                {{ th === 'All' ? 'Tous les HDV' : 'HDV ' + th }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown class="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <UiButton @click="showSidebar = true" :icon="Plus" variant="primary">Ajouter une stratégie</UiButton>
        </div>
      </div>

      <!-- Type Navigation (Tabs style) -->
      <div v-if="isMounted" class="flex items-center border-b border-slate-100 -mx-2 px-2">
        <div class="flex items-center gap-8 overflow-x-auto scrollbar-hide">
          <button 
            v-for="type in types" 
            :key="type.id"
            @click="selectedType = type.id"
            class="relative py-3 text-sm font-bold transition-all whitespace-nowrap"
            :class="selectedType === type.id ? 'text-indigo-900' : 'text-slate-400 hover:text-slate-600'"
          >
            <div class="flex items-center gap-2">
              <component :is="type.icon" class="w-4 h-4" />
              {{ type.label }}
            </div>
            <!-- Active Indicator -->
            <div 
              v-if="selectedType === type.id" 
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
            ></div>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <ClientOnly>
      <div v-if="isMounted" class="space-y-8">
        <!-- Error Message -->
        <UiAlert v-if="error" title="Erreur" variant="destructive">
          <p>{{ error }}</p>
          <UiButton size="sm" variant="outline" class="mt-3" @click="fetchStrategies">Réessayer</UiButton>
        </UiAlert>

        <!-- Grid -->
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="aspect-[16/9] bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center">
            <Loader2 class="w-6 h-6 text-slate-200 animate-spin" />
          </div>
        </div>
        
        <div v-else-if="filteredStrats.length === 0" class="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <div class="max-w-xs mx-auto space-y-4">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
               <Layers class="w-8 h-8" />
            </div>
            <h3 class="font-bold text-slate-900">Aucune stratégie trouvée</h3>
            <p class="text-slate-500 text-sm">Affiniez vos filtres ou proposez la première stratégie !</p>
            <UiButton size="sm" variant="outline" @click="selectedTH = 'All'; selectedType = 'All'">Reset Filters</UiButton>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="strat in filteredStrats" 
            :key="strat.id"
            class="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden group"
          >
            <!-- Thumbnail Area -->
            <div class="aspect-video bg-slate-900 relative overflow-hidden">
              <img 
                v-if="strat.video_url" 
                :src="`https://img.youtube.com/vi/${strat.video_url.split('v=')[1]?.split('&')[0]}/maxresdefault.jpg`" 
                class="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
              />
              <div class="absolute inset-0 flex items-center justify-center">
                 <PlayCircle class="w-12 h-12 text-white/80 group-hover:scale-110 transition-transform" />
              </div>
              
              <!-- Badges -->
              <div class="absolute top-4 left-4 flex flex-wrap gap-2">
                <span class="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10 uppercase tracking-tight">TH {{ strat.min_town_hall }}</span>
                <span class="bg-indigo-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10 uppercase tracking-tight capitalize">{{ strat.type }}</span>
              </div>

              <!-- Admin actions -->
              <div v-if="isAdmin" class="absolute top-4 right-4 flex gap-2">
                <button 
                  class="p-2 bg-white/10 backdrop-blur-md hover:bg-emerald-500 text-white rounded-lg border border-white/10 transition-colors"
                  @click="openEditSidebar(strat)"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button 
                  class="p-2 bg-white/10 backdrop-blur-md hover:bg-red-500 text-white rounded-lg border border-white/10 transition-colors"
                  @click="handleDeleteStrategy(strat.id)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Content Area -->
            <div class="p-5 flex-1 flex flex-col gap-4">
                <div class="flex flex-col">
                    <h3 class="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{{ strat.title }}</h3>
                    <p class="text-sm text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">{{ strat.description }}</p>
                    <span class="text-[10px] font-medium text-slate-400 mt-3">Ajouté le {{ new Date(strat.created_at).toLocaleDateString() }}</span>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 mt-auto pt-2">
                    <a 
                        v-if="strat.army_link"
                        :href="strat.army_link" 
                        target="_blank"
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                        <ExternalLink class="w-3.5 h-3.5" />
                        <span>Armée</span>
                    </a>
                    
                    <a 
                        v-if="strat.video_url"
                        :href="strat.video_url" 
                        target="_blank"
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-900 text-white text-xs font-bold transition-colors"
                    >
                        <span>Tuto</span>
                        <PlayCircle class="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>

    <!-- Sidebar Form -->
    <UiSidebar :show="showSidebar" :title="editingStratId ? 'Modifier la stratégie' : 'Ajouter une stratégie'" @close="closeSidebar">
      <form id="add-strat-form" @submit.prevent="handleAddStrategy" class="space-y-5">
        <UiInput v-model="newStrat.title" label="Nom de la compo" placeholder="ex: Queen Walk Hybrid" required />
        
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
          <textarea 
            v-model="newStrat.description" 
            class="w-full rounded-2xl border border-slate-200 bg-white text-slate-900 px-4 py-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
            placeholder="Détails de l'attaque..."
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UiSelect 
            v-model="newStrat.type" 
            label="Type" 
            :options="['ground', 'air', 'hybrid']" 
          />
          <UiSelect 
            v-model="newStrat.min_town_hall" 
            label="TH Minimum" 
            :options="[18, 17, 16, 15, 14, 13]" 
          />
        </div>

        <UiInput v-model="newStrat.army_link" label="Lien de l'armée" placeholder="https://link.clashofclans.com/..." />
        <UiInput v-model="newStrat.video_url" label="Lien Vidéo (YouTube)" placeholder="https://www.youtube.com/watch?v=..." />
      </form>

      <template #footer>
        <div class="grid grid-cols-2 gap-3">
           <UiButton type="button" variant="outline" @click="closeSidebar">Annuler</UiButton>
           <UiButton type="submit" form="add-strat-form" variant="primary" :loading="isAdding">
             {{ editingStratId ? 'Enregistrer' : 'Confirmer' }}
           </UiButton>
        </div>
      </template>
    </UiSidebar>
  </div>
</template>
