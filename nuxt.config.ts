// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'GTS — Global Testing System',
      meta: [
        { name: 'description', content: 'Global Testing System: online testing platform. English first, more subjects later.' }
      ]
    }
  }
})
