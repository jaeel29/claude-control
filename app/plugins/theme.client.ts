// Applies the saved/system theme as early as possible on the client so the
// dashboard and landing page render in the right theme without a flash.
export default defineNuxtPlugin(() => {
	const { initTheme } = useTheme();
	initTheme();
});
