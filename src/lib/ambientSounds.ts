// Offline ambient + focus music catalog.
// All sounds are generated in real-time via Web Audio API (see pomodoroSynth.ts).
// No downloads, instant playback.
export type SoundCategory = "ambient" | "study" | "relax" | "binaural";

export type AmbientSound = {
  id: string;
  name: string;
  emoji: string;
  category: SoundCategory;
  beta?: boolean;
  hint?: string;
};

export const AMBIENT_SOUNDS: AmbientSound[] = [
  // Nature ambience
  { id: "rain",   name: "باران",        emoji: "🌧️", category: "ambient" },
  { id: "waves",  name: "امواج دریا",   emoji: "🌊", category: "ambient" },
  { id: "wind",   name: "باد",          emoji: "🍃", category: "ambient" },
  { id: "fire",   name: "شومینه",       emoji: "🔥", category: "ambient" },
  { id: "forest", name: "جنگل",         emoji: "🌲", category: "ambient" },
  { id: "cafe",   name: "کافه",         emoji: "☕", category: "ambient" },

  // Study music (offline synth pads)
  { id: "study_pad", name: "پد مطالعه",  emoji: "📚", category: "study" },
  { id: "dream_pad", name: "رؤیا",       emoji: "✨", category: "study" },
  { id: "lofi_pad",  name: "Lo-fi گرم",  emoji: "🎶", category: "study" },

  // Relaxation
  { id: "calm_pad", name: "آرامش",       emoji: "🧘", category: "relax" },

  // Binaural beats — headphones REQUIRED
  { id: "binaural_beta",  name: "Beta — تمرکز عمیق",   emoji: "🎧", category: "binaural", beta: true, hint: "حتماً با هندزفری" },
  { id: "binaural_alpha", name: "Alpha — تمرکز آرام",  emoji: "🎧", category: "binaural", beta: true, hint: "حتماً با هندزفری" },
  { id: "binaural_theta", name: "Theta — مدیتیشن",     emoji: "🎧", category: "binaural", beta: true, hint: "حتماً با هندزفری" },
  { id: "binaural_delta", name: "Delta — خواب عمیق",   emoji: "🎧", category: "binaural", beta: true, hint: "حتماً با هندزفری" },
];

export const SOUND_CATEGORY_META: Record<SoundCategory, { label: string; emoji: string }> = {
  ambient:  { label: "محیطی",    emoji: "🌿" },
  study:    { label: "مطالعه",   emoji: "📚" },
  relax:    { label: "آرامش",    emoji: "🧘" },
  binaural: { label: "امواج مغزی (هندزفری)", emoji: "🎧" },
};
