export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme-preference';

const getInitialTheme = (): Theme => {
	if (typeof window === 'undefined') return 'system';
	const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
	return saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
};

const getInitialSystemTheme = (): ResolvedTheme => {
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const selectedTheme = ref<Theme>(getInitialTheme());
const systemTheme = ref<ResolvedTheme>(getInitialSystemTheme());

export const useTheme = () => {
	const resolvedTheme = computed<ResolvedTheme>(() => {
		if (selectedTheme.value === 'system') return systemTheme.value;
		return selectedTheme.value;
	});

	const applyTheme = (theme: ResolvedTheme) => {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		root.classList.remove('light', 'dark');
		root.classList.add(theme);
		root.setAttribute('data-theme', theme);
	};

	const setTheme = (theme: Theme) => {
		selectedTheme.value = theme;
		if (typeof window !== 'undefined') {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		}
		applyTheme(resolvedTheme.value);
	};

	/** Cycle light → dark → system → light (used by the toggle button). */
	const toggleTheme = () => {
		const order: Theme[] = ['light', 'dark', 'system'];
		const next = order[(order.indexOf(selectedTheme.value) + 1) % order.length]!;
		setTheme(next);
	};

	const initTheme = () => {
		if (typeof window === 'undefined') return;

		const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
		if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
			selectedTheme.value = savedTheme;
		}

		systemTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		applyTheme(resolvedTheme.value);

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			systemTheme.value = e.matches ? 'dark' : 'light';
			if (selectedTheme.value === 'system') applyTheme(resolvedTheme.value);
		};

		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener('change', handleChange);
		} else {
			mediaQuery.addListener(handleChange);
		}
	};

	return { selectedTheme, resolvedTheme, setTheme, toggleTheme, initTheme };
};
