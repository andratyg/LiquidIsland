export interface LyricLine {
  id: number;
  time: number; // Seconds
  textEn: string;
  textId: string;
}

export const TOTAL_DURATION = 256; // 04:16

export const PAPER_SKY_LYRICS: LyricLine[] = [
  {
    id: 1,
    time: 0,
    textEn: '[Intro - Gentle breeze & acoustic guitar]',
    textId: '[Intro - Angin sepoi & gitar akustik]',
  },
  {
    id: 2,
    time: 14,
    textEn: 'Paper airplanes across the morning sky',
    textId: 'Pesawat kertas melintasi langit pagi',
  },
  {
    id: 3,
    time: 32,
    textEn: 'Tracing the whispers of a forgotten dream',
    textId: 'Menelusuri bisikan dari mimpi yang terlupa',
  },
  {
    id: 4,
    time: 50,
    textEn: 'If I could be by your side today',
    textId: 'Jika aku bisa berada di sisimu hari ini',
  },
  {
    id: 5,
    time: 72,
    textEn: "I'll give you all my seasons, rain or shine",
    textId: 'Kan kuberikan seluruh musimku padamu, hujan atau panas',
  },
  {
    id: 6,
    time: 96,
    textEn: 'Drifting clouds beneath the summer sun',
    textId: 'Awan berarak di bawah mentari musim panas',
  },
  {
    id: 7,
    time: 120,
    textEn: 'Catching the light before the day is done',
    textId: 'Menangkap cahaya sebelum senja berlabuh',
  },
  {
    id: 8,
    time: 144,
    textEn: 'We wrote our names upon the open blue',
    textId: 'Kita tuliskan nama kita di atas hamparan biru',
  },
  {
    id: 9,
    time: 168,
    textEn: 'Every folded page returns to you',
    textId: 'Setiap lipatan halaman kan kembali kepadamu',
  },
  {
    id: 10,
    time: 190, // Active at 03:13 (193s)
    textEn: 'And when the paper wings begin to fall',
    textId: 'Dan saat sayap kertas mulai berjatuhan',
  },
  {
    id: 11,
    time: 208,
    textEn: 'Your melody will guide me through it all',
    textId: 'Melodimu kan menuntunku melalui segalanya',
  },
  {
    id: 12,
    time: 226,
    textEn: 'Lumen Coast fades into evening glow',
    textId: 'Lumen Coast memudar dalam pendar petang',
  },
  {
    id: 13,
    time: 242,
    textEn: 'Paper sky, wherever you may go...',
    textId: 'Langit kertas, ke mana pun kau melangkah...',
  },
  {
    id: 14,
    time: 252,
    textEn: '[Outro - Ambient waves & lo-fi reverb]',
    textId: '[Outro - Debur ombak & dengung lo-fi]',
  },
];

/**
 * Returns the currently active lyric line for a given playback timestamp in seconds.
 * Supports custom live lyrics from LRCLib (Spotify / YouTube sync) or falls back to Paper Sky.
 */
export function getCurrentLyricLine(
  currentTime: number,
  customLyrics?: { time: number; text: string; textId?: string }[]
): { textEn: string; textId?: string; time: number } {
  if (customLyrics && customLyrics.length > 0) {
    for (let i = customLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= customLyrics[i].time) {
        return {
          time: customLyrics[i].time,
          textEn: customLyrics[i].text,
          textId: customLyrics[i].textId,
        };
      }
    }
    return {
      time: customLyrics[0].time,
      textEn: customLyrics[0].text,
      textId: customLyrics[0].textId,
    };
  }

  for (let i = PAPER_SKY_LYRICS.length - 1; i >= 0; i--) {
    if (currentTime >= PAPER_SKY_LYRICS[i].time) {
      return PAPER_SKY_LYRICS[i];
    }
  }
  return PAPER_SKY_LYRICS[0];
}

/**
 * Formats seconds into mm:ss
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats remaining seconds into -mm:ss
 */
export function formatRemaining(seconds: number, totalDuration: number = TOTAL_DURATION): string {
  const remaining = Math.max(0, totalDuration - seconds);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return `-${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
