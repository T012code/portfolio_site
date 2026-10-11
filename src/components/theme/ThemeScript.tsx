export const THEME_STORAGE_KEY = "layo-theme";

// Runs during HTML parsing, before first paint: applies a saved theme without a flash,
// and marks repeat visits this session so the preloader is skipped.
const script = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){d.dataset.theme=t}}catch(e){}try{if(sessionStorage.getItem("layo-preloaded")){d.dataset.preloaded=""}}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
