<script setup lang="ts">
import {
  Users,
  Scroll,
  Plus,
  Captions,
  ArrowLeft,
  Search,
  MoreVertical,
  GripHorizontal,
  X,
  Calendar,
  ChevronRight,
  UserPlus,
  Trash2,
  GripVertical
} from 'lucide-vue-next'
import AppSidebar from '~/components/ui/Sidebar.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient<any>()

// -- TYPES --
interface Player {
  tag: string
  name: string
  townHallLevel?: number
}

interface Inscription {
  id: string
  name: string
  created_at: string
}

interface InscriptionMember {
  id: string
  inscription_id: string
  player_tag: string
  player_name: string
  clan_tag: string | null
}

interface TrackedClan {
  tag: string
  name: string
  badge_url: string | null
  ordered: number
}

// -- STATE --
const viewMode = ref<'list' | 'board'>('list')
const loading = ref(false)
const inscriptions = ref<Inscription[]>([])
const trackedClans = ref<TrackedClan[]>([])
const allPlayers = ref<Player[]>([]) // Source: players

// Board State
const selectedInscription = ref<Inscription | null>(null)
const boardMembers = ref<InscriptionMember[]>([])
const dragSource = ref<{ type: 'available' | 'clan', id: string } | null>(null)
const dragTarget = ref<string | null>(null) // ID of the container being hovered
const playerSearch = ref('')
// Forms
const showSidebar = ref(false)
const showAddPlayerForm = ref(false)
const newInscriptionName = ref('')
const createError = ref('')
const isCreating = ref(false)

// -- COMPUTED --

// 1. Available Players (Top Row)
const availablePlayers = computed(() => {
  return boardMembers.value
    .filter(m => m.clan_tag === null)
})

// 2. Board Columns (Clans)
const boardColumns = computed(() => {
  return trackedClans.value.map(clan => {
    const members = boardMembers.value.filter(m => m.clan_tag === clan.tag)
    return {
      clan,
      members
    }
  })
})

// 3. Potential Players (Dropdown)
// Filtered by search and by players ALREADY in the board
const potentialPlayers = computed(() => {
    const existingTags = new Set(boardMembers.value.map(m => m.player_tag))
    const search = playerSearch.value.toLowerCase()
    
    if (!search && !showAddPlayerForm.value) return []
    
    // Filter out players already in the board
    let filtered = allPlayers.value.filter(p => !existingTags.has(p.tag))
    
    if (search) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.tag.toLowerCase().includes(search))
    }
    
    return filtered.slice(0, 50)
})

// -- METHODS --

const init = async () => {
    loading.value = true
    await Promise.all([
        fetchInscriptions(),
        fetchTrackedClans(),
        fetchAllPlayers()
    ])
    loading.value = false
}

const fetchInscriptions = async () => {
  const { data } = await supabase
    .from('inscriptions')
    .select('*')
    .order('created_at', { ascending: false })
  inscriptions.value = data || []
}

const fetchTrackedClans = async () => {
  const { data } = await supabase.from('tracked_clans').select('*').order('ordered')
  trackedClans.value = data || []
}

const fetchAllPlayers = async () => {
  // Use players as source of truth for "Available to Add"
  const { data } = await supabase.from('players').select('tag, name').order('name')
  allPlayers.value = data || []

}

const createInscription = async () => {
  createError.value = ''
  
  if (!newInscriptionName.value.trim()) {
      createError.value = 'Le nom de la liste est obligatoire.'
      return
  }

  isCreating.value = true
  try {
    const { data, error } = await supabase
      .from('inscriptions')
      .insert({ name: newInscriptionName.value })
      .select()
      .single()

    if (error) throw error

    if (data) {
      inscriptions.value.unshift(data)
      closeSidebar()
      openBoard(data)
    }
  } catch (err: any) {
    console.error('Error creating inscription:', err)
    createError.value = err.message || "Une erreur est survenue lors de la création."
  } finally {
    isCreating.value = false
  }
}

const closeSidebar = () => {
  showSidebar.value = false
  newInscriptionName.value = ''
  createError.value = ''
}

const openBoard = async (inscription: Inscription) => {
  selectedInscription.value = inscription
  viewMode.value = 'board'
  await fetchBoardMembers(inscription.id)
}

const closeBoard = () => {
  selectedInscription.value = null
  viewMode.value = 'list'
  boardMembers.value = []
}

const fetchBoardMembers = async (inscriptionId: string) => {
  const { data } = await supabase
    .from('inscription_members')
    .select('*')
    .eq('inscription_id', inscriptionId)
  
  boardMembers.value = data || []
}

const addPlayerToBoard = async (player: Player) => {
    if (!selectedInscription.value) return

    // 1. Optimistic Update
    const newMember: InscriptionMember = {
        id: 'temp-' + Date.now(),
        inscription_id: selectedInscription.value.id,
        player_tag: player.tag,
        player_name: player.name,
        clan_tag: null
    }
    boardMembers.value.push(newMember)

    // 2. Upsert into players table to ensure FK constraint met
    const { error: upsertError } = await supabase
        .from('players')
        .upsert({ tag: player.tag, name: player.name })
        .select()
    
    if (upsertError) {
        console.error("Failed to upsert player", upsertError)
    }

    // 3. Insert into inscription_members
    const { data, error } = await supabase
        .from('inscription_members')
        .insert({
            inscription_id: selectedInscription.value.id,
            player_tag: player.tag,
            player_name: player.name,
            clan_tag: null
        })
        .select()
        .single()
    
    if (data) {
        const idx = boardMembers.value.findIndex(m => m.id === newMember.id)
        if (idx !== -1) boardMembers.value[idx] = data
        if (idx !== -1) boardMembers.value[idx] = data
    } else {
        boardMembers.value = boardMembers.value.filter(m => m.id !== newMember.id)
    }
}

// -- DRAG & DROP LOGIC --

const onDragStart = (evt: DragEvent, type: 'available' | 'clan', id: string) => {
    if (evt.dataTransfer) {
        evt.dataTransfer.effectAllowed = 'move'
        evt.dataTransfer.dropEffect = 'move'
        evt.dataTransfer.setData('text/plain', id)
        dragSource.value = { type, id }
    }
}

const onDragEnter = (targetTag: string | 'available') => {
    if (dragSource.value) {
        dragTarget.value = targetTag
    }
}

const onDragEnd = () => {
    dragSource.value = null
    dragTarget.value = null
}

const onDrop = async (evt: DragEvent, targetClanTag: string | 'available') => {
    const source = dragSource.value
    // Reset visual feedback immediately
    dragTarget.value = null
    
    if (!source || !selectedInscription.value) return

    const member = boardMembers.value.find(m => m.id === source.id)
    if (!member) return

    const newClanTag = targetClanTag === 'available' ? null : targetClanTag
    const oldClanTag = member.clan_tag

    if (newClanTag === oldClanTag) return // No change

    // Optimistic Update
    member.clan_tag = newClanTag 
    
    // Server Sync
    const { error } = await supabase
        .from('inscription_members')
        .update({ clan_tag: newClanTag })
        .eq('id', member.id)
    
    if (error) {
        console.error("Move failed", error)
        member.clan_tag = oldClanTag // Rollback
    }

    dragSource.value = null
}

const removeMember = async (memberId: string) => {


    const removedMember = boardMembers.value.find(m => m.id === memberId)
    boardMembers.value = boardMembers.value.filter(m => m.id !== memberId)

    const { error } = await supabase
        .from('inscription_members')
        .delete()
        .eq('id', memberId)
    
    if (error && removedMember) {
        boardMembers.value.push(removedMember)
    }
}

const deleteInscription = async (e: Event, id: string) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette inscription ?')) return
    
    const { error } = await supabase.from('inscriptions').delete().eq('id', id)
    if (!error) {
        inscriptions.value = inscriptions.value.filter(i => i.id !== id)
    }
}

onMounted(() => {
  init()
})
</script>

<template>
  <div class="h-[calc(100vh-4rem)] flex flex-col gap-6">
    
    <!-- HEADER -->
    <div class="px-2 flex flex-col md:flex-row md:items-center justify-between gap-4">

        <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Captions class="w-5 h-5" />
          </div>
          {{ viewMode === 'board' ? selectedInscription?.name : 'Inscriptions' }}
        </h1>
        
        <div v-if="viewMode === 'list'">
             <UiButton @click="showSidebar = true" :icon="Plus" variant="primary">Nouvelle</UiButton>
        </div>
    </div>

    <!-- VIEW: LIST (Same as before but cleaned up) -->
    <div v-if="viewMode === 'list'" class="flex-1">
            
            <!-- Create Form (Moved to Sidebar) -->

            <div v-if="loading && inscriptions.length === 0" class="flex justify-center py-20">
                <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-indigo-600"></div>
            </div>

            <div v-else-if="inscriptions.length === 0" class="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
                <Scroll class="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 class="text-base font-bold text-slate-900">Aucune inscription</h3>
                <p class="text-slate-400 text-sm mt-1">Créez une liste pour commencer à organiser vos joueurs.</p>
            </div>

            <div v-else class="space-y-3">
               <div 
                   v-for="ins in inscriptions" 
                   :key="ins.id"
                   @click="openBoard(ins)"
                   class="group bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-200"
               >
                   <div class="flex items-center gap-4">
                       <div class="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
                           <Scroll class="w-5 h-5" />
                       </div>
                       <div>
                           <h3 class="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{{ ins.name }}</h3>
                           <div class="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                               <Calendar class="w-3 h-3" />
                               <span>{{ new Date(ins.created_at).toLocaleDateString() }}</span>
                           </div>
                       </div>
                   </div>
                   
                   <div class="flex items-center gap-2">
                       <ChevronRight class="w-5 h-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                   </div>
               </div>
            </div>
    </div>

    <!-- VIEW: BOARD -->
    <div v-else class="flex-1 flex flex-col min-h-100 overflow-hidden relative rounded-2xl bg-gray-50">
        
        <!-- TOP: AVAILABLE PLAYERS "POOL" -->
        <div 
            class="shrink-0 border-b border-slate-200 z-20 flex flex-col md:flex-row"
            @dragover.prevent="onDragEnter('available')"
            @drop="onDrop($event, 'available')"
            :class="{ 'bg-indigo-50/30': dragTarget === 'available' }"
        >
             <!-- Search / Add Area -->
             <div class="w-full md:w-72 shrink-0 p-3 border-b md:border-b-0 md:border-r border-slate-200 flex items-center z-30">
                 <div class="relative flex-1 group" ref="searchContainer">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      v-model="playerSearch" 
                      type="text" 
                      placeholder="Ajouter joueur..." 
                      class="w-full pl-9 bg-white border border-transparent rounded-lg py-2 text-sm border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all font-medium placeholder:text-slate-400"
                      @focus="showAddPlayerForm = true"
                    />
                    
                    <!-- Suggestions Dropdown -->
                    <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0">
                    <div 
                       v-if="(showAddPlayerForm || playerSearch) && potentialPlayers.length > 0"
                       class="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-md max-h-[300px] overflow-y-auto z-50"
                    >
                        <div class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 sticky top-0 border-b border-slate-50">Suggestions</div>
                        <button 
                           v-for="p in potentialPlayers" 
                           :key="p.tag"
                           @click="addPlayerToBoard(p)"
                           class="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left group/item"
                        >
                            <div class="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {{ p.name.charAt(0) }}
                            </div>
                            <div class="min-w-0">
                                <div class="font-semibold text-xs text-slate-700 truncate group-hover/item:text-slate-900">{{ p.name }}</div>
                            </div>
                            <Plus class="w-3.5 h-3.5 text-slate-300 ml-auto group-hover/item:text-indigo-500" />
                        </button>
                    </div>
                    </Transition>
                    <div v-if="showAddPlayerForm" class="fixed inset-0 z-[-1]" @click="showAddPlayerForm = false"></div>
                 </div>
             </div>

             <!-- Drop Zone: Available Strip -->
             <!-- Uses TransitionGroup for smooth horizontal animation -->
             <div 
                class="flex-1 min-w-0 overflow-x-auto custom-scrollbar flex items-center px-4 py-3 gap-2 lg:max-w-3xl xl:max-w-5xl"
             >
                 <div v-if="availablePlayers.length === 0" key="empty-msg" class="flex items-center gap-2 text-xs text-slate-400 italic px-2 pointer-events-none select-none">
                     <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                        <GripHorizontal class="w-3 h-3 text-slate-300" />
                     </div>
                     <span>Réservoir de joueurs</span>
                 </div>
                 
                 <div 
                    v-for="member in availablePlayers"
                    :key="member.id"
                    draggable="true"
                    @dragstart="onDragStart($event, 'available', member.id)"
                    @dragend="onDragEnd"
                    class="group relative bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm px-2.5 py-1.5 rounded-lg cursor-grab active:cursor-grabbing flex items-center gap-2 shrink-0 transition-all select-none"
                    :class="{ 'opacity-50 dashed-border': dragSource?.id === member.id }"
                 >
                     <GripVertical class="w-3 h-3 text-slate-300 group-hover:text-slate-400" />
                     <div class="font-bold text-xs text-slate-700 whitespace-nowrap">{{ member.player_name }}</div>
                     <button type="button" @click.stop="removeMember(member.id)" @mousedown.stop class="ml-1 hover:bg-red-50 p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors">
                        <X class="w-3 h-3" />
                     </button>
                 </div>
             </div>
        </div>

        <!-- MAIN POOL: CLANS -->
        <div class="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 snap-x bg-slate-50/50">
             <div 
                v-for="col in boardColumns" 
                :key="col.clan.tag"
                class="min-w-60 shrink-0 bg-white flex flex-col h-full max-h-full snap-center rounded-2xl transition-colors duration-300"
                @dragover.prevent="onDragEnter(col.clan.tag)"
                @drop="onDrop($event, col.clan.tag)"
                :class="dragTarget === col.clan.tag ? 'bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'bg-transparent'"
             >
                <!-- Column Header -->
                <div class="mb-3 flex items-center justify-between px-4 pt-3 pb-0">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center p-1 overflow-hidden">
                           <img v-if="col.clan.badge_url" :src="col.clan.badge_url" class="w-full h-full object-contain" />
                           <span v-else class="font-bold text-slate-400 text-xs">{{ col.clan.name.charAt(0) }}</span>
                        </div>
                        <div class="min-w-0">
                           <div class="font-bold text-slate-900 text-sm truncate max-w-[160px]" :title="col.clan.name">{{ col.clan.name }}</div>
                        </div>
                    </div>
                    <span class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                        {{ col.members.length }}
                    </span>
                </div>

                <!-- Drop Zone (Cards) -->
                <TransitionGroup 
                    tag="div" 
                    name="list-vertical"
                    class="flex-1 overflow-y-auto px-3 pb-4 space-y-2 custom-scrollbar relative"
                >
                    <div 
                       v-for="member in col.members" 
                       :key="member.id"
                       draggable="true"
                       @dragstart="onDragStart($event, 'clan', member.id)"
                       @dragend="onDragEnd"
                       class="relative bg-white p-3 rounded-xl border border-slate-200/60 border border-slate-200 hover:shadow-xs hover:border-indigo-300/50 cursor-grab active:cursor-grabbing transition-all group select-none"
                       :class="{ 'opacity-40': dragSource?.id === member.id }"
                    > 
                       <div class="flex items-center gap-3">
                           <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-xs text-slate-400 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                               {{ member.player_name.charAt(0) }}
                           </div>
                           <div class="min-w-0">
                               <div class="font-bold text-sm text-slate-700 truncate group-hover:text-slate-900">{{ member.player_name }}</div>
                               <div class="text-[10px] text-slate-400 font-mono truncate">{{ member.player_tag }}</div>
                           </div>
                       </div>
                    </div>
                </TransitionGroup>
                
                <!-- Empty State (if no members) -->
                <div v-if="col.members.length === 0" class="flex-1 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl m-1 opacity-60 pointer-events-none">
                    <span class="text-xs font-medium">Vide</span>
                </div>
             </div>
        </div>

    </div>

  </div>


    <!-- Sidebar Form -->
    <AppSidebar :show="showSidebar" title="Nouvelle liste" @close="closeSidebar">
      <form id="create-inscription-form" @submit.prevent="createInscription" class="space-y-5">
        <UiInput 
            v-model="newInscriptionName" 
            label="Nom de la liste" 
            placeholder="ex: CWL Février 2024" 
            :error="createError"
            autoFocus
        />
      </form>

      <template #footer>
        <div class="grid grid-cols-2 gap-3">
           <UiButton type="button" variant="outline" @click="closeSidebar">Annuler</UiButton>
           <UiButton type="submit" form="create-inscription-form" variant="primary" :loading="isCreating">Créer</UiButton>
        </div>
      </template>
    </AppSidebar>
</template>

<style scoped>
/* Scrollbar Styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Transitions */
.list-vertical-move,
.list-horizontal-move {
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1.0);
}

.list-vertical-enter-active,
.list-vertical-leave-active,
.list-horizontal-enter-active,
.list-horizontal-leave-active {
  transition: all 0.2s ease;
}

.list-vertical-enter-from,
.list-vertical-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-horizontal-enter-from,
.list-horizontal-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* Ensure items leaving don't break layout flow immediately */
.list-vertical-leave-active {
  position: absolute;
  width: 100%; /* Important for vertical lists to stay same width during leave */
}

.dashed-border {
    border-style: dashed;
}
</style>
