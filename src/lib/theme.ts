// Plain module (not "use client") so the server layout can inline the script.
export const THEME_KEY = "internagent.theme";

// Runs in <head> before first paint so dark mode never flashes white.
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
