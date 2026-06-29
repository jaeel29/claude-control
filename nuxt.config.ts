export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', href: '/favicon.ico' },
      ],
    },
  },
  css: ['~/assets/css/variables.css', '~/assets/css/main.css', '~/assets/css/scrollbar.css'],
  modules: ['@nuxt/icon'],
  router: {
    options: {
      // Smooth scroll for in-page anchor links (#features, #how, #faq).
      scrollBehaviorType: 'smooth',
    },
  },
  nitro: {
    experimental: { wasm: false }
  },

  icon: {
    customCollections: [
      {
        prefix: 'icons',
        dir: './app/assets/icons',
      },
      {
        prefix: 'ai',
        dir: './app/assets/icons/ai',
      },
    ],
  },
});
