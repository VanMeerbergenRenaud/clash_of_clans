<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
import UiAlert from '~/components/ui/Alert.vue'

const loading = ref(false)
const email = ref('')
const password = ref('')
const errorMsg = ref('')

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (error) throw error
    
    router.push('/')
  } catch (error: any) {
    errorMsg.value = error.message
  } finally {
    loading.value = false
  }
}

watchEffect(() => {
  if (user.value) {
    router.push('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-[url('https://wallpaperaccess.com/full/379058.jpg')] bg-cover bg-center">
    <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
    
    <div class="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">Clash Manager</h1>
        <p class="text-slate-300">Connectez-vous pour gérer votre clan</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-200 mb-2">Email</label>
          <input 
            v-model="email"
            type="email" 
            required
            class="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            placeholder="chef@clan.com"
          />
        </div>

        <div>
           <label class="block text-sm font-medium text-slate-200 mb-2">Mot de passe</label>
          <input 
            v-model="password"
            type="password" 
            required
            class="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <UiAlert v-if="errorMsg" variant="destructive" title="Erreur de connexion">
          {{ errorMsg }}
        </UiAlert>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold border border-indigo-400/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Connexion...</span>
          <span v-else>Se connecter</span>
        </button>
      </form>
    </div>
  </div>
</template>
