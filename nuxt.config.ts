// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@nuxtjs/color-mode'
  ],
  supabase: {
    redirect: false
  },
  runtimeConfig: {
    cocApiToken: process.env.COC_API_TOKEN,
    public: {
      // Optional: Use external proxy (Cloudflare Worker) in production
      cocProxyUrl: process.env.NUXT_PUBLIC_COC_PROXY_URL || ''
    }
  },
  css: [
    '~/assets/css/main.css'
  ]
})
