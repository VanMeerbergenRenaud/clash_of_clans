<script setup lang="ts">
import { Map, Share2, Copy, Download, ExternalLink, Plus, X, Loader2, Image as ImageIcon, Trash2, Home, ChevronDown } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'
import UiInput from '~/components/ui/Input.vue'
import UiAlert from '~/components/ui/Alert.vue'
import UiSidebar from '~/components/ui/Sidebar.vue'
import UiSelect from '~/components/ui/Select.vue'

// Default images mapping
import th18Img from '~/assets/img/th/th18.jpeg'
import th17Img from '~/assets/img/th/th17.jpeg'
import th16Img from '~/assets/img/th/th16.jpeg'

const thImages: Record<number | string, string> = {
  18: th18Img,
  17: th17Img,
  16: th16Img
}

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

const thLevels = ['All', 18, 17, 16]
const types = ['All', 'War', 'Farming', 'Trophy', 'Fun']

const showSidebar = ref(false)
const isAdding = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

const newBase = ref({
  title: '',
  th: 18,
  type: 'War',
  link: '',
  image_url: ''
})

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    imageFile.value = target.files[0]
    imagePreview.value = URL.createObjectURL(imageFile.value)
  }
}

const uploadImage = async (file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `bases/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('bases')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('bases').getPublicUrl(filePath)
  return data.publicUrl
}

const fileInput = ref<HTMLInputElement | null>(null)

const handleAddBase = async () => {
  if (!newBase.value.title || !newBase.value.link) return
  
  isAdding.value = true
  try {
    let image_url = ''
    if (imageFile.value) {
      image_url = await uploadImage(imageFile.value)
    }

    const { error } = await (supabase
      .from('base_link') as any)
      .insert({
        name: newBase.value.title,
        th: newBase.value.th,
        type: newBase.value.type.toLowerCase(),
        link: newBase.value.link,
        image_url: image_url
      })

    if (error) {
       console.error('Insert error:', error)
       alert('Erreur: ' + error.message)
    } else {
       await fetchBases()
       closeSidebar()
    }
  } catch (err: any) {
    console.error('Unexpected error:', err)
    alert('Erreur inattendue')
  } finally {
    isAdding.value = false
  }
}

const closeSidebar = () => {
  showSidebar.value = false
  newBase.value = { title: '', th: 18, type: 'War', link: '', image_url: '' }
  imageFile.value = null
  imagePreview.value = null
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
  <div class="space-y-8 pb-32">
    <!-- HEADER & FILTERS -->
    <div class="flex flex-col gap-8">
      <!-- Title & Main Actions Row -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Home class="w-5 h-5" />
            </div>
            Bases
          </h1>
        </div>

        <div v-if="isMounted" class="flex items-center gap-3">
          <!-- TH Select Dropdown -->
          <div class="relative">
            <select 
              v-model="selectedTH" 
              class="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-sm font-bold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-w-[120px]"
            >
              <option v-for="th in thLevels" :key="th" :value="th">
                {{ th === 'All' ? 'Tous les HDV' : 'HDV ' + th }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown class="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <UiButton @click="showSidebar = true" :icon="Plus" variant="primary">Ajouter une base</UiButton>
        </div>
      </div>

      <!-- Type Navigation (Tabs style) -->
      <div v-if="isMounted" class="flex items-center border-b border-slate-100 -mx-2 px-2">
        <div class="flex items-center gap-8 overflow-x-auto scrollbar-hide">
          <button 
            v-for="type in types" 
            :key="type"
            @click="selectedType = type"
            class="relative py-3 text-sm font-bold transition-all whitespace-nowrap"
            :class="selectedType === type ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'"
          >
            {{ type }}
            <!-- Active Indicator -->
            <div 
              v-if="selectedType === type" 
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"
            ></div>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <ClientOnly>
      <div v-if="isMounted" class="space-y-8">
        <!-- Error Message -->
        <UiAlert v-if="errorMessage" title="Erreur" variant="destructive">
          <p>{{ errorMessage }}</p>
          <UiButton size="sm" variant="outline" class="mt-3" @click="fetchBases">Réessayer</UiButton>
        </UiAlert>

        <!-- Grid -->
        <div v-if="loadingBases" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="aspect-[4/3] bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center">
            <Loader2 class="w-6 h-6 text-slate-200 animate-spin" />
          </div>
        </div>
        
        <div v-else-if="filteredBases.length === 0" class="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <div class="max-w-xs mx-auto space-y-4">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
               <Map class="w-8 h-8" />
            </div>
            <h3 class="font-bold text-slate-900">Aucune base trouvée</h3>
            <p class="text-slate-500 text-sm">Affiniez vos filtres ou ajoutez la première base !</p>
            <UiButton size="sm" variant="outline" @click="selectedTH = 'All'; selectedType = 'All'">Reset Filters</UiButton>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="base in filteredBases" 
            :key="base.id"
            class="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            <!-- Image Area -->
            <div class="aspect-[4/3] bg-slate-50 relative overflow-hidden">
              <img :src="base.image_url || thImages[base.th] || thImages[16]" alt="Preview" class="w-full h-full object-cover" />
              
              <!-- Badges -->
              <div class="absolute top-4 left-4 flex flex-wrap gap-2">
                <span class="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10 uppercase tracking-tight">TH {{ base.th }}</span>
                <span class="bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10 uppercase tracking-tight">{{ base.type }}</span>
              </div>

              <!-- Admin delete button -->
              <button 
                v-if="isAdmin" 
                class="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md hover:bg-red-500 text-white rounded-lg border border-white/10 transition-colors"
                :disabled="isDeleting === base.id"
                @click="handleDeleteBase(base.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>

            <!-- Content Area -->
            <div class="p-5 flex-1 flex flex-col gap-4">
                <div class="flex flex-col">
                    <h3 class="font-bold text-slate-900 line-clamp-1">{{ base.name || 'Untitled Base' }}</h3>
                    <span class="text-[10px] font-medium text-slate-400 mt-0.5">Ajouté le {{ base.created_at ? new Date(base.created_at).toLocaleDateString() : 'N/A' }}</span>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 mt-auto">
                    <button 
                        @click="copyToClipboard(base.link)"
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                        <Copy class="w-3.5 h-3.5" />
                        <span>Copier</span>
                    </button>
                    
                    <a 
                        :href="base.link" 
                        target="_blank"
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold transition-colors"
                    >
                        <span>Ouvrir</span>
                        <ExternalLink class="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>

    <!-- Sidebar Form -->
    <UiSidebar :show="showSidebar" title="Ajouter une base" @close="closeSidebar">
      <form id="add-base-form" @submit.prevent="handleAddBase" class="space-y-5">
        <UiInput v-model="newBase.title" label="Nom de la base" placeholder="ex: War Base Anti-3" required />
        
        <div class="grid grid-cols-2 gap-4">
          <UiSelect 
            v-model="newBase.th" 
            label="Town Hall" 
            :options="[18, 17, 16]" 
          />
          <UiSelect 
            v-model="newBase.type" 
            label="Type" 
            :options="types.filter(t => t !== 'All')" 
          />
        </div>

        <UiInput v-model="newBase.link" label="Lien de la base" placeholder="https://link.clashofclans.com/..." required />

        <!-- Image Upload -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest">Image de la base</label>
          <div 
            class="relative aspect-video rounded-2xl border border-slate-200 border-dashed overflow-hidden flex flex-col items-center justify-center bg-slate-50/50 group hover:border-emerald-500/50 hover:bg-slate-50 transition-all cursor-pointer"
            @click="fileInput?.click()"
          >
            <img v-if="imagePreview" :src="imagePreview" class="absolute inset-0 w-full h-full object-cover" />
            <div v-else class="flex flex-col items-center gap-2 text-slate-400">
              <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                <ImageIcon class="w-5 h-5 group-hover:text-emerald-500" />
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider">Cliquez pour ajouter une image</span>
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
      </form>

      <template #footer>
        <div class="grid grid-cols-2 gap-3">
           <UiButton type="button" variant="outline" @click="closeSidebar">Annuler</UiButton>
           <UiButton type="submit" form="add-base-form" variant="primary" :loading="isAdding">Confirmer</UiButton>
        </div>
      </template>
    </UiSidebar>
  </div>
</template>
