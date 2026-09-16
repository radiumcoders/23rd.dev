/**
 * Blocking `<head>` snippet. Must stay in sync with `ThemeProvider`:
 * `attribute="class"`, `storageKey="theme"`, `defaultTheme="system"`, `enableSystem`.
 *
 * next-themes injects the same logic from a client component inside `<body>`.
 * React 19 / streaming can paint `:root` light tokens before that script runs.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var d=document.documentElement,c=d.classList;c.remove("light","dark");var t=localStorage.getItem("theme");if(t==="system"||!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}c.add(t);if(t==="light"||t==="dark")d.style.colorScheme=t}catch(e){}})();`
