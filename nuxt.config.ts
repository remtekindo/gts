import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    // Deploy target: Cloudflare Pages + Pages Functions + D1.
    // `pnpm dev` is unaffected; this preset applies to `pnpm build`.
    preset: 'cloudflare-pages'
  },
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
