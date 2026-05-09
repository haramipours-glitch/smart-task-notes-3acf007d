// Ambient + focus music tracks (CC0 / royalty-free)
// Pixabay direct hot-linking is blocked; using Mixkit (ambient) + Incompetech (music, CC-BY Kevin MacLeod).
export type AmbientSound = {
  id: string;
  name: string;
  emoji: string;
  url: string;
  beta?: boolean;
  category?: "ambient" | "music";
  credit?: string;
};

export const AMBIENT_SOUNDS: AmbientSound[] = [
  // Ambient (Mixkit, royalty-free)
  { id: "rain",   name: "باران",       emoji: "🌧️", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3" },
  { id: "forest", name: "جنگل",        emoji: "🌲", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/1210/1210-preview.mp3" },
  { id: "waves",  name: "امواج دریا",  emoji: "🌊", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/1196/1196-preview.mp3" },
  { id: "cafe",   name: "کافه",        emoji: "☕", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/2435/2435-preview.mp3" },
  { id: "fire",   name: "شومینه",       emoji: "🔥", category: "ambient", url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3" },

  // Focus music — BETA (Kevin MacLeod / incompetech, CC-BY 4.0)
  { id: "meditation_1", name: "Meditation 1 (BETA)", emoji: "🧘",  beta: true, category: "music",
    credit: "Kevin MacLeod • CC-BY",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2001.mp3" },
  { id: "meditation_2", name: "Meditation 2 (BETA)", emoji: "🪷",  beta: true, category: "music",
    credit: "Kevin MacLeod • CC-BY",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2003.mp3" },
  { id: "tranquility",  name: "Tranquility (BETA)",  emoji: "🌌",  beta: true, category: "music",
    credit: "Kevin MacLeod • CC-BY",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Tranquility.mp3" },
  { id: "floating",     name: "Floating Cities (BETA)", emoji: "🏙️", beta: true, category: "music",
    credit: "Kevin MacLeod • CC-BY",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Floating%20Cities.mp3" },
  { id: "inspired",     name: "Inspired (BETA)",     emoji: "✨",  beta: true, category: "music",
    credit: "Kevin MacLeod • CC-BY",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Inspired.mp3" },
];
