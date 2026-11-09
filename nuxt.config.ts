// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Service Flow Hub',
    },
  },
  typescript: {
    strict: true,
  },
  // Seed JSON is inlined via import.meta.glob in server/utils/store.ts (Vercel-safe).
})
