// Ambient + focus music tracks (CC0 / royalty-free)
// Pixabay direct hot-linking is blocked; using Mixkit which allows hot-linking.
export type AmbientSound = {
  id: string;
  name: string;
  emoji: string;
  url: string;
  beta?: boolean;
  category?: "ambient" | "music";
};

export const AMBIENT_SOUNDS: AmbientSound[] = [
  // Ambient
  { id: "rain",   name: "باران",       emoji: "🌧️", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3" },
  { id: "forest", name: "جنگل",        emoji: "🌲", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/1210/1210-preview.mp3" },
  { id: "waves",  name: "امواج دریا",  emoji: "🌊", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/1196/1196-preview.mp3" },
  { id: "cafe",   name: "کافه",        emoji: "☕", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/2435/2435-preview.mp3" },
  { id: "fire",   name: "شومینه",       emoji: "🔥", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3" },

  // Focus music — BETA (royalty-free instrumental)
  { id: "lofi_chill",  name: "Lo-fi Chill (BETA)",   emoji: "🎧", beta: true, category: "music", url: "https://assets.mixkit.co/music/preview/mixkit-lofi-03-621.mp3" },
  { id: "lofi_study",  name: "Lo-fi Study (BETA)",   emoji: "📚", beta: true, category: "music", url: "https://assets.mixkit.co/music/preview/mixkit-lofi-04-622.mp3" },
  { id: "deep_focus",  name: "Deep Focus (BETA)",    emoji: "🧠", beta: true, category: "music", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3" },
  { id: "piano_calm",  name: "Calm Piano (BETA)",    emoji: "🎹", beta: true, category: "music", url: "https://assets.mixkit.co/music/preview/mixkit-relaxing-in-nature-522.mp3" },
];
