// Free CC0 ambient sound URLs (streamable)
export type AmbientSound = {
  id: string;
  name: string;
  emoji: string;
  url: string;
};

export const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: "rain",
    name: "باران",
    emoji: "🌧️",
    url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8b1fe0e3a3.mp3",
  },
  {
    id: "forest",
    name: "جنگل",
    emoji: "🌲",
    url: "https://cdn.pixabay.com/audio/2022/10/30/audio_347111d57a.mp3",
  },
  {
    id: "cafe",
    name: "کافه",
    emoji: "☕",
    url: "https://cdn.pixabay.com/audio/2022/03/24/audio_d0b1a0d4e0.mp3",
  },
  {
    id: "waves",
    name: "امواج دریا",
    emoji: "🌊",
    url: "https://cdn.pixabay.com/audio/2021/09/06/audio_a934c4f8c8.mp3",
  },
  {
    id: "fire",
    name: "شومینه",
    emoji: "🔥",
    url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
];
