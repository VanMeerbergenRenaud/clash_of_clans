// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase'
  ],
  supabase: {
    redirect: false
  },
  runtimeConfig: {
    cocApiToken: process.env.COC_API_TOKEN,
    public: {
      // Any public config
    }
  },
  css: [
    '~/assets/css/main.css'
  ]
})
