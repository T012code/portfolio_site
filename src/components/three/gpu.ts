// One check, shared by the preloader and the hero, run once per page load.
let cached: boolean | undefined;

/** True when the device can render the 3D scenes smoothly (a real GPU, no data saver). */
export function canRender3D(): boolean {
  if (cached !== undefined) return cached;
  cached = detect();
  return cached;
}

function detect(): boolean {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return false;
    if ((nav.hardwareConcurrency ?? 8) < 4) return false;
    if (nav.deviceMemory !== undefined && nav.deviceMemory < 3) return false;

    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    // Free the probe context before anything else is created.
    gl.getExtension("WEBGL_lose_context")?.loseContext();

    if (new URLSearchParams(window.location.search).get("3d") === "force") return true;
    // Without a GPU, WebGL falls back to CPU rendering and would block the page.
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}
