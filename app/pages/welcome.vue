<script setup lang="ts">
import { Mail, LogIn, Swords } from 'lucide-vue-next'

definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const user = useSupabaseUser()

// Redirect to dashboard if already logged in
watchEffect(() => {
  if (user.value) {
    router.push('/')
  }
})

const contactEmail = 'renaud.vanmeerbergen@gmail.com'
const emailSubject = 'Demande de compte CoC Manager'
const emailBody = 'Bonjour,\n\nJe souhaiterais accéder à CoC Manager.\n\nMerci !'

const requestAccountUrl = `mailto:${contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-[url('/img/wallpapers/coc.jpeg')] bg-cover bg-center">
    <div class="absolute inset-0 bg-slate-900/85 backdrop-blur-sm"></div>
    
    <div class="relative w-full max-w-lg text-center">
      <!-- Logo and Title -->
      <div class="mb-10">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 mb-6">
          <Swords class="w-10 h-10" />
        </div>
        <h1 class="text-5xl font-bold text-white mb-4 tracking-tight">
          CoC Manager
        </h1>
        <p class="text-lg text-slate-300 max-w-md mx-auto leading-relaxed">
          Gérez vos clans, organisez vos guerres et suivez les performances de vos joueurs.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink 
          to="/login"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold border border-indigo-400/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25"
        >
          <LogIn class="w-5 h-5" />
          Se connecter
        </NuxtLink>
        
        <a 
          :href="requestAccountUrl"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 backdrop-blur-sm transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Mail class="w-5 h-5" />
          Demander un compte
        </a>
      </div>

      <!-- Footer -->
      <p class="mt-12 text-sm font-medium text-slate-300">
        Créé par PaDaWaN
      </p>
    </div>
  </div>
</template>
