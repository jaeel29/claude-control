export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  nitro: {
    experimental: { wasm: false }
  }
})
