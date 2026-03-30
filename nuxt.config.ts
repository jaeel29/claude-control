export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/icon'],
  nitro: {
    experimental: { wasm: false }
  },

  icon: {
    customCollections: [{
      prefix: 'icons',
      dir: './app/assets/icons'
    }],
  },
});
