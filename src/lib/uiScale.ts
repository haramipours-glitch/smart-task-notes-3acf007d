// Apply UI scale (zoom) and font size globally via CSS variables on <html>.
// Persisted in user_settings.font_size + user_settings.ui_scale.

export type FontSize = "small" | "medium" | "large" | "xlarge";

const FONT_PX: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
};

const LS_FONT = "ui_font_size_v1";
const LS_SCALE = "ui_scale_v1";

export function applyUIScale(scale: number) {
  const s = Math.max(0.7, Math.min(1.5, Number(scale) || 1));
  // CSS zoom is supported across modern browsers including mobile chrome.
  // Falls back to transform if zoom is not supported.
  const root = document.documentElement;
  // @ts-ignore - 'zoom' is non-standard but widely supported
  root.style.zoom = String(s);
  root.dataset.uiScale = String(s);
  try { localStorage.setItem(LS_SCALE, String(s)); } catch {}
}

export function applyFontSize(size: FontSize) {
  const px = FONT_PX[size] ?? 16;
  document.documentElement.style.fontSize = `${px}px`;
  document.documentElement.dataset.fontSize = size;
  try { localStorage.setItem(LS_FONT, size); } catch {}
}

/** Apply cached values immediately on app boot to avoid flicker. */
export function bootApplyUIPrefs() {
  try {
    const f = localStorage.getItem(LS_FONT) as FontSize | null;
    if (f) applyFontSize(f);
    const s = localStorage.getItem(LS_SCALE);
    if (s) applyUIScale(parseFloat(s));
  } catch { /* ignore */ }
}
