export const PRELOADED_EVENT = "layo:preloaded";

/** Run `callback` once the preloader has finished, or right away if there isn't one. */
export function whenPreloaded(callback: () => void): () => void {
  const active =
    !("preloaded" in document.documentElement.dataset) && document.querySelector("[data-preloader]") !== null;
  if (!active) {
    callback();
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener(PRELOADED_EVENT, handler, { once: true });
  return () => window.removeEventListener(PRELOADED_EVENT, handler);
}
