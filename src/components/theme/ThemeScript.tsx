export const THEME_STORAGE_KEY = "layo-theme";

// Runs during HTML parsing, before first paint, so a saved theme never flashes.
const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
