<script setup lang="ts">
import { Map, Filter, Share2, Copy, Download, Star, ExternalLink, Plus, X, Loader2 } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'
import UiInput from '~/components/ui/Input.vue'
import UiAlert from '~/components/ui/Alert.vue'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const profile = ref<any>(null)
const bases = ref<any[]>([])
const loadingBases = ref(true)
const errorMessage = ref('')
const isMounted = ref(false)

const fetchProfile = async () => {
  if (!user.value?.id) return
  const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single()
  profile.value = data
}

const fetchBases = async () => {
  loadingBases.value = true
  errorMessage.value = ''
  
  try {
    const { data, error } = await supabase
      .from('base_link')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    bases.value = data || []
  } catch (err: any) {
    console.error('Error fetching bases:', err)
    errorMessage.value = err.message
  } finally {
    loadingBases.value = false
  }
}

const isAdmin = computed(() => profile.value?.user_type === 'admin')

onMounted(async () => {
  isMounted.value = true
  await fetchProfile()
  await fetchBases()
})

const selectedTH = ref('All')
const selectedType = ref('All')

const thLevels = ['All', 17, 16]
const types = ['All', 'War', 'Farming', 'Trophy', 'Fun']

const showAddModal = ref(false)
const newBase = ref({
  title: '',
  th: 17,
  type: 'War',
  link: ''
})

const thImages: Record<number | string, string> = {
  17: 'https://clashofclans-layouts.com/images/layouts/16/16_13.jpg', // Placeholder since verified TH17 image is not available
  16: 'https://clashofclans-layouts.com/images/layouts/16/16_13.jpg'
}

const isAdding = ref(false)

const handleAddBase = async () => {
  if (!newBase.value.title || !newBase.value.link) return
  
  isAdding.value = true
  try {
    const { data, error } = await (supabase
      .from('base_link') as any)
      .insert({
        name: newBase.value.title,
        th: newBase.value.th,
        type: newBase.value.type.toLowerCase(),
        link: newBase.value.link
      })
      .select()

    if (error) {
       console.error('Insert error:', error)
       alert('Erreur: ' + error.message)
    } else {
       await fetchBases()
       showAddModal.value = false
       newBase.value = { title: '', th: 18, type: 'War', link: '' }
    }
  } catch (err: any) {
    console.error('Unexpected insert error:', err)
  } finally {
    isAdding.value = false
  }
}

const copyToClipboard = (text: string) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  alert('Lien copié dans le presse-papier !')
}

const filteredBases = computed(() => {
  if (!bases.value) return []
  return bases.value.filter(base => {
    const matchTH = selectedTH.value === 'All' || Number(base.th) === Number(selectedTH.value)
    const matchType = selectedType.value === 'All' || base.type?.toLowerCase() === selectedType.value.toLowerCase()
    return matchTH && matchType
  })
})

const isDeleting = ref<number | null>(null)

const handleDeleteBase = async (id: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette base ?')) return
  
  isDeleting.value = id
  try {
    const { error } = await supabase
      .from('base_link')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Delete error:', error)
      alert('Erreur lors de la suppression : ' + error.message)
    } else {
      await fetchBases()
    }
  } catch (err: any) {
    console.error('Unexpected delete error:', err)
  } finally {
    isDeleting.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Map class="w-8 h-8 text-emerald-600" />
          Base Layouts
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Trouvez et partagez les meilleures défenses</p>
      </div>
      
      <div v-if="isMounted" class="flex flex-col sm:flex-row gap-4">
        <div class="flex items-center bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
          <button 
            v-for="th in thLevels" 
            :key="th"
            @click="selectedTH = th"
            class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
            :class="selectedTH === th ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
          >
            {{ th === 'All' ? 'Tous' : 'TH' + th }}
          </button>
        </div>

        <UiButton @click="showAddModal = true" :icon="Plus">Ajouter une base</UiButton>
      </div>
    </div>

    <!-- Content (Wrapped in ClientOnly and isMounted to strictly avoid Hydration issues) -->
    <ClientOnly>
      <div v-if="isMounted" class="space-y-6">
        <!-- Filters -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          <button 
            v-for="type in types" 
            :key="type"
            @click="selectedType = type"
            class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border"
            :class="selectedType === type 
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white' 
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'"
          >
            {{ type }}
          </button>
        </div>

        <!-- Error Message -->
        <!-- Error Message -->
        <UiAlert v-if="errorMessage" title="Erreur de connexion" variant="destructive">
          <p>{{ errorMessage }}</p>
          <UiButton size="sm" variant="outline" class="mt-3 border-red-200 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/20" @click="fetchBases">Réessayer</UiButton>
        </UiAlert>

        <!-- Grid -->
        <div v-if="loadingBases" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center">
            <Loader2 class="w-8 h-8 text-slate-300 animate-spin" />
          </div>
        </div>
        
        <div v-else-if="filteredBases.length === 0" class="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
          <div class="max-w-xs mx-auto space-y-4">
            <div class="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-2xl">📭</div>
            <h3 class="font-bold text-slate-900 dark:text-white">Aucune base trouvée</h3>
            <p class="text-slate-500 text-sm">Affiniez vos filtres ou ajoutez la première base !</p>
            <UiButton size="sm" variant="outline" @click="selectedTH = 'All'; selectedType = 'All'">Reset Filters</UiButton>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div 
            v-for="base in filteredBases" 
            :key="base.id"
            class="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300"
          >
            <!-- Image Area -->
            <div class="aspect-[16/9] bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
              <img :src="thImages[base.th] || thImages[16]" alt="Preview" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute top-3 left-3 flex gap-2">
                <span class="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">TH {{ base.th }}</span>
                <span class="bg-indigo-600/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded capitalize">{{ base.type }}</span>
              </div>
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                 <UiButton size="sm" variant="secondary" :icon="Copy" @click="copyToClipboard(base.link)">Lien</UiButton>
                 <a :href="base.link" target="_blank">
                   <UiButton size="sm" variant="primary" :icon="ExternalLink">Ouvrir</UiButton>
                 </a>
                 <UiButton 
                   v-if="isAdmin" 
                   size="sm" 
                   variant="danger" 
                   :icon="X" 
                   :loading="isDeleting === base.id"
                   @click="handleDeleteBase(base.id)"
                 >
                   Supprimer
                 </UiButton>
              </div>
            </div>

            <!-- Info Area -->
            <div class="p-5">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h3 class="font-bold text-slate-900 dark:text-white line-clamp-1">{{ base.name || 'Untitled Base' }}</h3>
                  <p class="text-[10px] text-slate-400 mt-1 uppercase">Added on {{ base.created_at ? new Date(base.created_at).toLocaleDateString() : 'Unknown date' }}</p>
                </div>
                <div class="flex items-center gap-1 text-amber-500 font-bold text-xs">
                   <Star class="w-3 h-3 fill-current" />
                   <span>5.0</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>

    <!-- Modal (Client Only) -->
    <ClientOnly>
      <div v-if="showAddModal && isMounted" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAddModal = false"></div>
        
        <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Nouvelle base</h2>
            <button @click="showAddModal = false" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <X class="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form @submit.prevent="handleAddBase" class="p-6 space-y-4">
            <UiInput v-model="newBase.title" label="Nom" placeholder="ex: War Base Anti-3" required />
            
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Town Hall</label>
                <select v-model="newBase.th" class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5">
                  <option v-for="th in [17, 16]" :key="th" :value="th">TH{{ th }}</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                <select v-model="newBase.type" class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5">
                  <option v-for="type in types.filter(t => t !== 'All')" :key="type" :value="type">{{ type }}</option>
                </select>
              </div>
            </div>

            <UiInput v-model="newBase.link" label="Lien" placeholder="https://link.clashofclans.com/..." required />

            <div class="flex gap-3 mt-8">
              <UiButton type="button" variant="outline" block @click="showAddModal = false">Annuler</UiButton>
              <UiButton type="submit" variant="primary" block :loading="isAdding">Confirmer</UiButton>
            </div>
          </form>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>
