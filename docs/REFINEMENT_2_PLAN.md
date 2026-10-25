# Refinement Phase 2 Plan: Real Windows System Media Integration (Spotify, YouTube, YouTube Music) + Auto Synced Lyrics

## Overview
Refinement Phase 2 transforms LiquidIsland from a static/mock media player into a **real-time desktop media companion** deeply integrated with Windows System Media Transport Controls (SMTC). It captures whatever is actively playing on **Spotify, YouTube (in any browser), YouTube Music, Apple Music, or native media players**, allows hardware-level playback control (`Play/Pause`, `Next`, `Previous`), and automatically fetches real-time synced lyrics via LRCLib with optional Indonesian dual subtitles.

---

## 1. Rust Windows System Media Transport Controls (SMTC) Architecture

### 1.1 Windows Runtime (WinRT) SMTC Integration (`src-tauri/src/media_session.rs`)
Windows 10/11 exposes global media session information through the WinRT namespace `windows::Media::Control`.
- **Session Manager Access:**
  ```rust
  let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.get()?;
  let current_session = manager.GetCurrentSession()?;
  ```
- **Metadata Extraction:**
  - **Playback Info:** `session.GetPlaybackInfo()?.PlaybackStatus()?` (`Playing`, `Paused`, `Stopped`, etc.).
  - **Media Properties:** `session.TryGetMediaPropertiesAsync()?.get()?`:
    - `title`: Track title (e.g., `"Starboy"`).
    - `artist`: Artist name (e.g., `"The Weeknd"`).
    - `album_title`: Album or collection title.
    - `thumbnail`: Optional `IRandomAccessStreamReference` read into a Base64 data URI or raw buffer.
  - **Timeline Properties:** `session.GetTimelineProperties()?`:
    - `position_secs`: Current playback position in seconds (`timeline.Position()?.Duration / 10_000_000`).
    - `duration_secs`: Total track duration in seconds (`(timeline.EndTime()?.Duration - timeline.StartTime()?.Duration) / 10_000_000`).
  - **Source Application Identification:**
    - `session.SourceAppUserModelId()?.to_string()` maps the process or App ID:
      - Spotify Desktop App -> `"Spotify"`
      - Google Chrome / Edge / Brave / Firefox / Opera -> `"YouTube"` (if video/music is detected) or `"Browser"`
      - YouTube Music PWA / Desktop -> `"YouTube Music"`
      - iTunes / Apple Music -> `"Apple Music"`
      - Fallback -> `"Windows Media"`

### 1.2 IPC Events & Transport Control Commands
- **Tauri Event Emission:**
  - Background thread polls every 1000ms (or when media updates).
  - Emits `"system-media-update"` with structured JSON payload `SystemMediaPayload`.
- **Exposed Tauri Commands:**
  - `media_play_pause() -> bool`: calls `session.TryTogglePlayPauseAsync()`
  - `media_next_track() -> bool`: calls `session.TrySkipNextAsync()`
  - `media_prev_track() -> bool`: calls `session.TrySkipPreviousAsync()`

---

## 2. Automatic Real-Time Synced Lyrics Engine (`src/utils/liveLyricsFetcher.ts`)

### 2.1 Title Normalization & LRCLib Query
Songs streamed from YouTube or Spotify frequently contain noise tags in titles:
- Clean regex filters:
  - `/\((official\s*(music\s*)?video|video|audio|lyric(s)?(\s*video)?|official|remastered|mv)\)/gi`
  - `/\[(official\s*(music\s*)?video|video|audio|lyric(s)?|mv)\]/gi`
  - `/\s*-\s*(official\s*video|mv|audio|remastered)/gi`
  - `/\s*(ft\.|feat\.).*$/gi`
- Target Endpoint:
  - `https://lrclib.net/api/search?q=${encodeURIComponent(cleanArtist + ' ' + cleanTitle)}`
  - Alternatively: `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`

### 2.2 LRC Parser & Dual Subtitle Generator
- Parses LRC timestamps: `[mm:ss.xx]` -> floating/integer seconds.
- Creates structured `LyricLine[]` array with `{ time: number, textEn: string, textId?: string }`.
- If `dualSubtitleEnabled` is active, generates/fetches contextual Indonesian translation subtitles for every synced line.
- In-memory LRU cache prevents redundant network requests for tracks already fetched.
- Graceful offline / instrumental fallback to built-in `PAPER_SKY_LYRICS`.

---

## 3. UI Synchronization & Real Control

### 3.1 `MusicLyricsSlide.tsx` Overhaul
- **Real Metadata Display:** Real song title, real artist name, and real playback progress.
- **Source App Badge:** Sleek pill showing the active player source:
  - Spotify: Green accent badge
  - YouTube: Red accent badge
  - YouTube Music: Red/Orange accent badge
- **Native Transport Control:**
  - Clicking `⏮` sends `media_prev_track` to Spotify/YouTube.
  - Clicking `⏸/▶` sends `media_play_pause` to Spotify/YouTube.
  - Clicking `⏭` sends `media_next_track` to Spotify/YouTube.
- **Real-Time Synced Lyrics Wing:**
  - Uses the fetched live lyrics array from `liveLyricsFetcher.ts`.
  - Automatically scrolls the active line to center as `playbackTime` ticks.
  - Renders cyan Indonesian subtitles if `dualSubtitleEnabled` is toggled.

### 3.2 `CompactView.tsx` & `CompanionStage.tsx`
- **Compact Island View:** 5-bar waveform animates dynamically when Spotify/YouTube is playing, and pauses when paused.
- **Companion Stage:** Renders the active live lyric line from the real song playing on Spotify/YouTube in the scrolling mini-banner.

---

## 4. Execution Plan
1. **Rust Media Session Module**:
   - Create `src-tauri/src/media_session.rs` with SMTC listener and control commands.
   - Register commands and startup thread in `src-tauri/src/lib.rs`.
2. **Lyrics Fetcher Engine**:
   - Create `src/utils/liveLyricsFetcher.ts` with LRCLib search and LRC parser.
3. **Store Integration**:
   - Extend `SystemSettings` in `src/types/liquid.ts` and `src/store/useSystemStore.ts` with media metadata.
4. **UI Updates**:
   - Update `MusicLyricsSlide.tsx` with source badges, real media commands, and live lyrics.
   - Update `CompanionStage.tsx` and `CompactView.tsx` to reflect real media playback.
5. **Compilation & Testing**:
   - Compile Rust backend with `cargo check` and verify `npm run build`.
