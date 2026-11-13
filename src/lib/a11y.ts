export type A11ySettings = {
  textSize: "normal" | "large" | "xlarge";
  highContrast: boolean;
  readableFont: boolean;
  wideSpacing: boolean;
  reduceMotion: boolean;
  strongFocus: boolean;
};

export const A11Y_KEY = "internagent.a11y";

export const DEFAULT_A11Y: A11ySettings = {
  textSize: "normal",
  highContrast: false,
  readableFont: false,
  wideSpacing: false,
  reduceMotion: false,
  strongFocus: false,
};

// Each setting is a class on <html>; globals.css does the rest.
const CLASSES: Record<Exclude<keyof A11ySettings, "textSize">, string> = {
  highContrast: "a11y-contrast",
  readableFont: "a11y-font",
  wideSpacing: "a11y-spacing",
  reduceMotion: "a11y-motion",
  strongFocus: "a11y-focus",
};

export function applyA11y(s: A11ySettings) {
  const el = document.documentElement;
  el.classList.remove("a11y-text-large", "a11y-text-xlarge");
  if (s.textSize !== "normal") el.classList.add(`a11y-text-${s.textSize}`);
  for (const [key, cls] of Object.entries(CLASSES)) el.classList.toggle(cls, !!s[key as keyof typeof CLASSES]);
}

// Inline <head> script version of applyA11y, so settings apply before first paint.
export const a11yInitScript = `try{var s=JSON.parse(localStorage.getItem("${A11Y_KEY}")||"{}"),c=document.documentElement.classList;if(s.textSize&&s.textSize!=="normal")c.add("a11y-text-"+s.textSize);var m=${JSON.stringify(CLASSES)};for(var k in m)if(s[k])c.add(m[k])}catch(e){}`;
