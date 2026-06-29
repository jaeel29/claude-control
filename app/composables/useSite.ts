// Shared site-level constants for the landing page (repo URL, package name).
// Single source of truth so every component links to the same place.
export const useSite = () => {
	const repoUrl = 'https://github.com/jaeel29/claude-control';
	const packageName = 'claude-control';
	return { repoUrl, packageName };
};
