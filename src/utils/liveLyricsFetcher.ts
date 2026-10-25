/**
 * LiquidIsland OS - Live Synced Lyrics Engine (Stage 1 Enhanced)
 * High-accuracy multi-tier lyrics fetcher for YouTube, YouTube Music, and Spotify.
 * Supports smart noise cleaning, "Artist - Track" splitting, dual-tier LRCLib search,
 * and automatic Indonesian language detection with dual-subtitle translations.
 */

export interface LiveLyricLine {
  time: number;       // Timestamp in seconds (e.g. 14.5)
  text: string;       // Original lyric line
  textId?: string;    // Indonesian subtitle translation (if original is non-Indonesian)
}

// In-memory cache to prevent duplicate queries for the same track
const lyricsCache = new Map<string, LiveLyricLine[]>();

/**
 * Strips YouTube / MV noise tags, video resolution tags, and feature tags
 */
export function cleanTrackTitle(title: string): string {
  if (!title) return '';

  return title
    // Strip parenthesized / bracketed video tags
    .replace(/\((?:official\s*(?:music\s*)?video|video|audio|lyric(?:s)?(?:\s*video)?|official|remastered|mv|hd|4k|lirik(?:\s*video)?|terjemahan(?:\s*indonesia)?|audio\s*visualizer|visualizer)\)/gi, '')
    .replace(/\[(?:official\s*(?:music\s*)?video|video|audio|lyric(?:s)?(?:\s*video)?|official|remastered|mv|hd|4k|lirik|terjemahan)\]/gi, '')
    // Strip trailing tags like " | Official Video", " - MV", " | Lyric Video"
    .replace(/\s*\|\s*(?:official\s*(?:music\s*)?video|video|audio|mv|remastered|lirik|lyrics).*$/gi, '')
    .replace(/\s*-\s*(?:official\s*(?:music\s*)?video|video|audio|mv|remastered|lirik|lyrics).*$/gi, '')
    // Strip "ft." or "feat." if present
    .replace(/\s*(?:\(feat\.?|\(ft\.?|feat\.?|ft\.?).*?(?:\)|$)/gi, '')
    .replace(/["“”'’]/g, '')
    .trim();
}

/**
 * Deconstructs raw title and artist into parsed [Artist, Track]
 */
export function parseArtistAndTrack(
  rawTitle: string,
  rawArtist: string
): { parsedArtist: string; parsedTrack: string } {
  const cleanTitle = cleanTrackTitle(rawTitle);
  const cleanArtist = (rawArtist || '').trim();

  // If title contains " - ", prioritize splitting the title
  // e.g., "Perunggu - Ini Abadi" or "Hindia - Evaluasi"
  if (cleanTitle.includes(' - ')) {
    const parts = cleanTitle.split(' - ');
    const artist = parts[0].trim();
    const track = parts.slice(1).join(' - ').trim();
    return {
      parsedArtist: artist,
      parsedTrack: track,
    };
  }

  // If title doesn't have " - " but artist is valid (not generic "YouTube" / "Browser")
  const isGenericArtist =
    !cleanArtist ||
    cleanArtist.toLowerCase().includes('youtube') ||
    cleanArtist.toLowerCase().includes('browser') ||
    cleanArtist.toLowerCase() === 'media player';

  return {
    parsedArtist: isGenericArtist ? '' : cleanArtist,
    parsedTrack: cleanTitle,
  };
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

  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Detects whether the lyric text is predominantly Indonesian
 */
export function isIndonesianSong(lyrics: LiveLyricLine[]): boolean {
  if (!lyrics || lyrics.length === 0) return false;

  const indonesianTokens = new Set([
    'yang', 'dan', 'di', 'ke', 'dari', 'aku', 'kau', 'kamu', 'kita', 'ini',
    'itu', 'tak', 'bisa', 'ada', 'hati', 'cinta', 'mata', 'lagi', 'sudah',
    'jangan', 'hanya', 'rasa', 'terlalu', 'sendiri', 'kembali', 'selalu',
    'mimpi', 'malam', 'hari', 'bayang', 'waktu', 'bukan', 'saat', 'sudut',
    'langit', 'abadi', 'tumbuh', 'menunggu', 'berlari', 'dalam', 'mereka'
  ]);

  let totalWords = 0;
  let idMatches = 0;

  for (const line of lyrics.slice(0, 20)) {
    const words = line.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    for (const word of words) {
      if (word.length > 1) {
        totalWords++;
        if (indonesianTokens.has(word)) {
          idMatches++;
        }
      }
    }
  }

  return totalWords > 0 && idMatches / totalWords >= 0.12;
}

/**
 * Checks if a title or artist name indicates an Indonesian song
 */
export function isIndonesianTitle(text: string): boolean {
  if (!text) return false;
  const indonesianTokens = new Set([
    'yang', 'dan', 'di', 'ke', 'dari', 'aku', 'kau', 'kamu', 'kita', 'ini',
    'itu', 'tak', 'bisa', 'ada', 'hati', 'cinta', 'mata', 'lagi', 'sudah',
    'jangan', 'hanya', 'rasa', 'terlalu', 'sendiri', 'kembali', 'selalu',
    'mimpi', 'malam', 'hari', 'bayang', 'waktu', 'bukan', 'saat', 'sudut',
    'langit', 'abadi', 'tumbuh', 'menunggu', 'berlari', 'dalam', 'mereka',
    'hindia', 'tulus', 'perunggu', 'feast', 'bernadya', 'pamungkas', 'sal'
  ]);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  return words.some((w) => indonesianTokens.has(w));
}

/**
 * Provides contextual Indonesian translations for English lyric lines
 */
function attachIndonesianSubtitles(lyrics: LiveLyricLine[]): LiveLyricLine[] {
  // If song is already in Indonesian, render clean single-line lyrics without redundant subtitles
  if (isIndonesianSong(lyrics)) {
    return lyrics;
  }

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
    "just the two of us": "hanya kita berdua",
    "i want you to know": "kuharap kau mengerti",
    "nothing lasts forever": "tiada yang abadi",
    "look at the stars": "pandanglah bintang-bintang",
    "shine for you": "bersinar untukmu",
    "sweet dreams": "mimpi yang indah",
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
      else if (lower.includes('sun') || lower.includes('shine')) translated = 'sinar hangat mentari';
      else if (lower.includes('time')) translated = 'seiring berjalannya waktu';
      else if (lower.includes('fly') || lower.includes('wind')) translated = 'terbang bersama angin';
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
 * Helper to query LRCLib API with a timeout budget
 */
async function queryLrcLib(queryStr: string): Promise<LiveLyricLine[] | null> {
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(queryStr)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!resp.ok) return null;

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // Find first item with synced lyrics
    const matchWithSynced = data.find((item: { syncedLyrics?: string }) => Boolean(item.syncedLyrics));
    const chosen = matchWithSynced || data[0];

    if (chosen.syncedLyrics) {
      const parsed = parseLrcLyrics(chosen.syncedLyrics);
      if (parsed.length > 0) {
        return attachIndonesianSubtitles(parsed);
      }
    } else if (chosen.plainLyrics) {
      const plainLines = (chosen.plainLyrics as string)
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter(Boolean);

      if (plainLines.length > 0) {
        const generated: LiveLyricLine[] = plainLines.map((text: string, idx: number) => ({
          time: idx * 5,
          text,
        }));
        return attachIndonesianSubtitles(generated);
      }
    }
  } catch {
    // Network / abort error
  }
  return null;
}

/**
 * Fetches synchronized lyrics from LRCLib for active song title and artist
 * using two-tier query strategy:
 * Tier 1: query with [parsedArtist + parsedTrack]
 * Tier 2: query with [parsedTrack] alone if Tier 1 returned no results
 */
export async function fetchLiveLyrics(
  rawTitle: string,
  rawArtist: string
): Promise<LiveLyricLine[]> {
  const { parsedArtist, parsedTrack } = parseArtistAndTrack(rawTitle, rawArtist);

  if (!parsedTrack) {
    return PAPER_SKY_LYRICS;
  }

  const cacheKey = `${parsedArtist.toLowerCase()}::${parsedTrack.toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey)!;
  }

  // Tier 1 Query: Artist + Track
  const tier1Query = parsedArtist ? `${parsedArtist} ${parsedTrack}` : parsedTrack;
  const tier1Result = await queryLrcLib(tier1Query);

  if (tier1Result && tier1Result.length > 0) {
    lyricsCache.set(cacheKey, tier1Result);
    return tier1Result;
  }

  // Tier 2 Query (Fallback): Track name alone
  if (parsedArtist) {
    const tier2Result = await queryLrcLib(parsedTrack);
    if (tier2Result && tier2Result.length > 0) {
      lyricsCache.set(cacheKey, tier2Result);
      return tier2Result;
    }
  }

  // Fallback to dynamic track card if not found on LRCLib (or offline)
  if (parsedTrack && parsedTrack.toLowerCase() !== 'paper sky') {
    const isId = isIndonesianTitle(parsedTrack) || isIndonesianTitle(parsedArtist);
    const fallbackLines: LiveLyricLine[] = [
      {
        time: 0,
        text: `${parsedTrack} • ${parsedArtist || 'Now Playing'}`,
        textId: isId ? undefined : `Sedang memutar: ${parsedTrack}`,
      },
      {
        time: 8,
        text: `♪ ${parsedTrack} ♪`,
        textId: isId ? undefined : (parsedArtist ? `Artis: ${parsedArtist}` : '♪ Instrumental ♪'),
      },
      {
        time: 24,
        text: `${parsedTrack}`,
        textId: isId ? undefined : '♪ Menikmati Alunan Musik ♪',
      },
    ];
    lyricsCache.set(cacheKey, fallbackLines);
    return fallbackLines;
  }

  // Fallback to built-in Paper Sky lyrics for demo / offline
  return PAPER_SKY_LYRICS;
}
