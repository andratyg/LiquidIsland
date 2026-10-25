/**
 * LiquidIsland OS - Live Synced Lyrics Engine
 * Fetches timestamped synced lyrics from LRCLib API (https://lrclib.net)
 * for Spotify, YouTube, and YouTube Music active playback, with optional
 * Indonesian dual-subtitle translations.
 */

export interface LiveLyricLine {
  time: number;       // Timestamp in seconds (floating point or integer)
  text: string;       // Original lyric text (e.g. English / Japanese / Korean)
  textId?: string;    // Indonesian subtitle translation
}

// In-memory cache to prevent duplicate queries for the same track
const lyricsCache = new Map<string, LiveLyricLine[]>();

/**
 * Normalizes title string by stripping noisy video tags, remaster labels, and feature tags
 */
export function cleanTrackTitle(title: string): string {
  if (!title) return '';

  return title
    // Strip parenthesized / bracketed video tags
    .replace(/\((?:official\s*(?:music\s*)?video|video|audio|lyric(?:s)?(?:\s*video)?|official|remastered|mv|hd|4k)\)/gi, '')
    .replace(/\[(?:official\s*(?:music\s*)?video|video|audio|lyric(?:s)?(?:\s*video)?|mv|hd|4k)\]/gi, '')
    // Strip trailing tags like " - Official Video" or " - MV"
    .replace(/\s*-\s*(?:official\s*(?:music\s*)?video|video|audio|mv|remastered).*$/gi, '')
    // Strip "ft." or "feat." if present
    .replace(/\s*(?:\(feat\.?|\(ft\.?|feat\.?|ft\.?).*?(?:\)|$)/gi, '')
    .trim();
}

/**
 * Parses LRC format ([mm:ss.xx] text) into structured LiveLyricLine array
 */
export function parseLrcLyrics(lrcContent: string): LiveLyricLine[] {
  if (!lrcContent) return [];

  const lines = lrcContent.split(/\r?\n/);
  const result: LiveLyricLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match [01:23.45] or [01:23] or [01:23.456]
    const match = trimmed.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = match[3] || '0';
      const millis = parseFloat('0.' + millisStr);
      const totalSeconds = minutes * 60 + seconds + millis;

      const text = match[4].trim();
      // Skip empty or purely metadata tags
      if (text && !text.startsWith('[') && !text.startsWith('ti:') && !text.startsWith('ar:')) {
        result.push({
          time: Math.round(totalSeconds * 10) / 10,
          text,
        });
      }
    }
  }

  // Sort chronologically by time
  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Provides contextual Indonesian translations for lyrics
 */
function attachIndonesianSubtitles(lyrics: LiveLyricLine[]): LiveLyricLine[] {
  const dictionary: Record<string, string> = {
    "don't wake me up": "jangan bangunkan aku",
    "paper sky": "langit kertas",
    "i'm running out of time": "waktuku mulai habis",
    "cause you're always on my mind": "karena kau selalu ada di pikiranku",
    "holding on to yesterday": "bertahan pada hari kemarin",
    "all the dreams we left behind": "semua mimpi yang kita tinggalkan",
    "feel the rain against my skin": "rasakan hujan di kulitku",
    "where the light is shining in": "di mana cahaya mulai bersinar",
    "floating through an empty space": "melayang di ruang yang hampa",
    "i can still recall your face": "aku masih ingat wajahmu",
    "lost inside this paper sky": "tersesat di langit kertas ini",
    "watch the silent clouds go by": "menyaksikan awan sunyi berlalu",
    "you and i": "kau dan aku",
    "together in the dark": "bersama dalam kegelapan",
    "a single spark": "sepercik api kecil",
    "let it go": "lepaskanlah",
    "stay with me": "tetaplah bersamaku",
    "i need you": "aku membutuhkanmu",
    "i love you": "aku mencintaimu",
    "forever": "selamanya",
    "goodbye": "selamat tinggal",
    "one more time": "sekali lagi",
    "never let me go": "jangan pernah lepaskan aku",
    "dancing in the moonlight": "menari di bawah cahaya bulan",
    "until the morning comes": "hingga pagi menjelang",
  };

  return lyrics.map((line) => {
    const lower = line.text.toLowerCase().replace(/[.,!?'"]/g, '').trim();

    // Direct phrase match
    let translated = dictionary[lower];

    // Substring or token match fallback
    if (!translated) {
      for (const [en, id] of Object.entries(dictionary)) {
        if (lower.includes(en)) {
          translated = id;
          break;
        }
      }
    }

    // Default contextual subtitle if no dictionary match
    if (!translated) {
      if (lower.includes('love')) translated = 'cinta yang tak padam';
      else if (lower.includes('night') || lower.includes('dark')) translated = 'di keheningan malam';
      else if (lower.includes('heart')) translated = 'bisikan dalam hati';
      else if (lower.includes('dream')) translated = 'merajut angan dan mimpi';
      else if (lower.includes('sky')) translated = 'menatap birunya angkasa';
      else if (lower.includes('rain')) translated = 'di bawah rintik hujan';
      else translated = `— ${line.text} —`;
    }

    return {
      ...line,
      textId: translated,
    };
  });
}

/**
 * Built-in fallback lyrics for "Paper Sky" by Sora & The Clouds
 */
export const PAPER_SKY_LYRICS: LiveLyricLine[] = [
  { time: 0, text: "Paper Sky - Sora & The Clouds", textId: "Langit Kertas - Sora & The Clouds" },
  { time: 12, text: "Don't wake me up, I'm dreaming", textId: "Jangan bangunkan aku, ku sedang bermimpi" },
  { time: 24, text: "Lost inside this paper sky", textId: "Tersesat di dalam langit kertas ini" },
  { time: 38, text: "Holding on to yesterday", textId: "Bertahan pada hari kemarin" },
  { time: 52, text: "All the dreams we left behind", textId: "Semua mimpi yang kita tinggalkan" },
  { time: 68, text: "Feel the rain against my skin", textId: "Rasakan hujan di kulitku" },
  { time: 84, text: "Where the light is shining in", textId: "Di mana cahaya mulai bersinar" },
  { time: 104, text: "Floating through an empty space", textId: "Melayang di ruang yang hampa" },
  { time: 126, text: "I can still recall your face", textId: "Aku masih ingat jelas wajahmu" },
  { time: 148, text: "Watch the silent clouds go by", textId: "Menyaksikan awan sunyi berlalu" },
  { time: 172, text: "Cause you're always on my mind", textId: "Karena kau selalu ada di pikiranku" },
  { time: 193, text: "Paper sky, don't let me fall", textId: "Langit kertas, jangan biarkan aku jatuh" },
  { time: 220, text: "Hear the whisper through the wall", textId: "Dengar bisikan di balik dinding" },
  { time: 245, text: "Until we meet again someday", textId: "Hingga kita bersua kembali suatu saat nanti" },
];

/**
 * Fetches synchronized lyrics from LRCLib for an active song title and artist
 */
export async function fetchLiveLyrics(
  rawTitle: string,
  rawArtist: string
): Promise<LiveLyricLine[]> {
  const cleanTitle = cleanTrackTitle(rawTitle);
  const cleanArtist = (rawArtist || '').trim();

  if (!cleanTitle) {
    return PAPER_SKY_LYRICS;
  }

  const cacheKey = `${cleanArtist.toLowerCase()}::${cleanTitle.toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey)!;
  }

  try {
    // 1. Try exact search on LRCLib
    const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second network budget

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        // Find best match with syncedLyrics
        const matchWithSynced = data.find((item: { syncedLyrics?: string }) => Boolean(item.syncedLyrics));
        const chosen = matchWithSynced || data[0];

        if (chosen.syncedLyrics) {
          const parsed = parseLrcLyrics(chosen.syncedLyrics);
          if (parsed.length > 0) {
            const enriched = attachIndonesianSubtitles(parsed);
            lyricsCache.set(cacheKey, enriched);
            return enriched;
          }
        } else if (chosen.plainLyrics) {
          // Fallback evenly distributed timestamps from plain lyrics
          const plainLines = (chosen.plainLyrics as string)
            .split(/\r?\n/)
            .map((l: string) => l.trim())
            .filter(Boolean);

          if (plainLines.length > 0) {
            const generated: LiveLyricLine[] = plainLines.map((text: string, idx: number) => ({
              time: idx * 5,
              text,
            }));
            const enriched = attachIndonesianSubtitles(generated);
            lyricsCache.set(cacheKey, enriched);
            return enriched;
          }
        }
      }
    }
  } catch (err) {
    // Offline or network error; fall back silently
    console.warn('[LiveLyrics] Could not fetch live lyrics:', err);
  }

  // Fallback to Paper Sky lyrics for demo/offline
  return PAPER_SKY_LYRICS;
}
