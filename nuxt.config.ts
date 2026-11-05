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
    modelApiKey: '',
    // Google Sign-In (server-side). Filled from env at runtime; see
    // README § Auth and .env.example. The Client ID is public by
    // design (the browser needs it); the client reads it from
    // GET /api/auth/config, not from this config.
    sessionSecret: '',
    adminEmails: '',
    // Test-only JWKS override, honored for localhost requests only.
    // Leave unset everywhere else.
    googleJwksUrl: '',
    public: {
      googleClientId: ''
    }
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
