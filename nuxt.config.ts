import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // Filled from NITRO_MODEL_API_KEY at runtime. Never expose to the client.
    modelApiKey: ''
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  },
  app: {
    head: {
      title: 'GTS — Global Testing System',
      meta: [
        { name: 'description', content: 'Global Testing System: online testing platform. English first, more subjects later.' }
      ]
    }
  }
})
