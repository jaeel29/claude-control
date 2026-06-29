<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Apply the saved/system theme BEFORE first paint to avoid a light→dark flash on
// refresh. This blocking inline head script runs before the body renders; the
// useTheme() composable then keeps it in sync after hydration.
useHead({
  script: [
    {
      innerHTML: `(function() {
        try {
          const theme = localStorage.getItem('theme-preference') || 'system';
          let resolved = theme;
          if (theme === 'system') {
            resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          document.documentElement.classList.add(resolved);
          document.documentElement.setAttribute('data-theme', resolved);
        } catch (e) {}
      })();`,
      tagPosition: 'head',
      type: 'text/javascript',
    },
  ],
});
</script>
