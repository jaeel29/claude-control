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
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Auto-inject the breakpoint mixins into every <style lang="scss">
          // block, so components call respond-to()/respond-from() without an
          // import. Function form (not a string): guard on the importer so the
          // plain .css files in css:[] don't get `@use` prepended (invalid CSS).
          additionalData(source: string, filename: string) {
            if (filename.endsWith('.css')) return source
            return `@use "~/assets/css/_breakpoints.scss" as *;\n${source}`
          },
        },
      },
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
