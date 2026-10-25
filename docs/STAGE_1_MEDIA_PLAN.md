# Stage 1 Implementation Plan: 100% Reliable YouTube, YouTube Music & Spotify Detection (SMTC + Window Title Engine) + Smart Lyrics Parser

## Executive Summary
This document establishes the architecture and execution blueprint for **Stage 1 of 3: Reliable Windows Media Detection & Synchronized Lyrics**. 
Prior implementations suffered from intermittent media detection because:
1. WinRT calls on background OS threads without explicit COM initialization (`CoInitializeEx`) can fail silently or return `CO_E_NOTINITIALIZED`.
2. WinRT's `GetCurrentSession()` often returns `None` or fails to promote browser instances (Chrome, Edge, Brave, Firefox) when multiple media sessions or background players exist.
3. YouTube video titles on the browser tab or SMTC often merge artist and song into a noisy string (e.g. `"Perunggu - Ini Abadi (Official Lyric Video)"`) while the artist field contains the YouTube channel name, preventing LRCLib from matching the song.
4. Thumbnail streams from SMTC were not read and transmitted to the frontend, and virtual media key fallbacks were missing from transport controls.

Stage 1 resolves these issues using a **Dual-Engine Architecture (WinRT SMTC + Win32 Window Enumerator)** and a **Smart YouTube Parser + Two-Tier LRCLib Query Engine** with seamless live Notch & Expanded Player synchronization.

---

## 1. Architecture & Component Workflow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WINDOWS OS ENVIRONMENT                          │
├───────────────────────────────────┬────────────────────────────────────┤
│  Engine A: WinRT SMTC             │  Engine B: Win32 Window Enum       │
│  - Multi-threaded COM init        │  - EnumWindows + GetWindowTextW    │
│  - Iterate ALL sessions           │  - Scans visible Chrome/Edge/      │
│  - Prioritize `Playing` (4)       │    Brave/Firefox/Spotify titles    │
│  - Stream thumbnail extraction    │  - Smooth local tick timer         │
└─────────────────┬─────────────────┴───────────────────┬────────────────┘
                  │                                     │
                  └───────────────┬─────────────────────┘
                                  ▼
                   Dual-Engine Resolver (`media_session.rs`)
                                  │
                                  ▼ Tauri Event: "system-media-update"
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND REACT APPLICATION                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. `App.tsx` & `useSystemStore.ts`:                                    │
│    - Stores `mediaTitle`, `mediaArtist`, `mediaAlbum`,                 │
│      `mediaSourceApp`, `mediaThumbnail` (base64 data URL),             │
│      `isAudioPlaying`, `playbackTime`, `mediaDuration`.                │
│                                                                        │
│ 2. `liveLyricsFetcher.ts`:                                             │
│    - Smart YouTube Title cleaner (strips tags, parses "Artist - Track")│
│    - Two-tier LRCLib query: query with artist+track, then track alone  │
│    - Synced LRC line parser + automatic Indonesian translation         │
│      (or clean single-line if song is already Indonesian).             │
│                                                                        │
│ 3. Live UI Components:                                                 │
│    - `CompanionStage.tsx`: Mini synced lyric ticker + source pill badge│
│    - `CompactView.tsx`: Live track title, green clock, waveform        │
│    - `MusicLyricsSlide.tsx`: Real YouTube thumbnail / Spotify art,     │
│      dual-subtitle synced lyrics list, and hardware media controls.    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Specifications & Detailed Design

### 2.1 Engine A: Fixed WinRT SMTC (`src-tauri/src/media_session.rs` & `Cargo.toml`)
1. **Thread COM Initialization**:
   - Inside the polling thread loop, call `CoInitializeEx(std::ptr::null(), COINIT_MULTITHREADED)` before accessing any WinRT APIs.
   - Cleanly pair with `CoUninitialize` on exit.
2. **Iterate All Media Sessions (`manager.GetSessions()`)**:
   - Rather than relying solely on `manager.GetCurrentSession()`, retrieve the complete collection via `manager.GetSessions()`.
   - Iterate through every session and inspect its `GetPlaybackInfo()?.PlaybackStatus()?`:
     - If any session has status `Playing` (`4`), select it immediately.
     - If none are playing, pick the first active session belonging to Chrome, Edge, Brave, Firefox, Opera, or Spotify.
3. **Timeline Extraction**:
   - Convert `timeline.Position()` 100-nanosecond ticks to seconds: `pos.Duration / 10_000_000`.
   - Calculate duration from `timeline.EndTime() - timeline.StartTime()`.
4. **Thumbnail Stream Extraction**:
   - Read `media_props.Thumbnail()` via `stream_ref.OpenReadAsync()`.
   - Read binary bytes via `DataReader::CreateDataReader(&stream)`.
   - Encode buffer to `data:image/png;base64,...` or `data:image/jpeg;base64,...` using the `base64` crate.

### 2.2 Engine B: Win32 Browser & Window Title Fallback
1. **Window Enumeration**:
   - If Engine A returns `has_media: false` or empty title, invoke `EnumWindows` scanning visible top-level windows (`IsWindowVisible(hwnd) != 0`).
   - Extract title with `GetWindowTextW`.
2. **Title Pattern Matching**:
   - Match `" - YouTube"` or `" - YouTube Music"` (e.g., `"Perunggu - Ini Abadi (Official Video) - YouTube - Google Chrome"`).
   - Match `"Spotify"` (Spotify desktop window title contains `"Artist - Track"` when playing).
3. **Title Deconstruction**:
   - Strip browser branding suffixes: `" - Google Chrome"`, `" - Microsoft Edge"`, `" - Brave"`, `" — Mozilla Firefox"`, `" - Opera"`.
   - Strip `" - YouTube Music"` or `" - YouTube"`.
   - Extract `"Artist - Title"`: if `" - "` delimiter is present, split into `[artist, title]`; otherwise attribute artist as `"YouTube"`.
   - Set `is_playing: true`, `source_app: "YouTube"` (or `"YouTube Music"` / `"Spotify"`).
   - Maintain a local position tick counter that advances smoothly every second while the same title plays.

### 2.3 Real Media Transport Controls (SMTC + Virtual Media Keys)
In `media_play_pause`, `media_next_track`, and `media_prev_track`:
- Invoke the SMTC session method (`TryTogglePlayPauseAsync`, `TrySkipNextAsync`, `TrySkipPreviousAsync`).
- **Simultaneously emit Win32 virtual media key events** using `keybd_event`:
  - `VK_MEDIA_PLAY_PAUSE` (`0xB3`)
  - `VK_MEDIA_NEXT_TRACK` (`0xB0`)
  - `VK_MEDIA_PREV_TRACK` (`0xB1`)
- This guarantees play/pause and track skipping work reliably across YouTube, YouTube Music, Spotify, and system media players.

### 2.4 Smart YouTube Title Cleaner & Auto Synced Lyrics (`src/utils/liveLyricsFetcher.ts`)
1. **Noise Tag Stripper**:
   - Strip `(Official Video)`, `[Official Audio]`, `(Lyric Video)`, `(Audio)`, `(MV)`, `| Official Music Video`, `ft. ...`, `feat. ...`, `Lirik`, `Terjemahan`, `HD`, `4K`.
2. **Artist & Track Separator**:
   - If title contains `" - "`, split into `parsedArtist` and `parsedTrack`.
3. **Two-Tier LRCLib Search**:
   - Tier 1: Search with `${parsedArtist} ${parsedTrack}`.
   - Tier 2: If Tier 1 returns no results, fallback search with `${parsedTrack}` alone.
4. **Synced LRC Parser & Indonesian Subtitles**:
   - Parse `[mm:ss.xx]` lines into structured `{ time, text, textId }`.
   - Language heuristic: if song is already in Indonesian, render clean single-line lyrics. If song is in English/foreign language, provide contextual Indonesian subtitle lines beneath each lyric line.

### 2.5 Instant Live Display Across Liquid Island Views
1. **Small Notch (`CompanionStage.tsx` in `eyes` mode)**:
   - Companion wearing headphones bobs to the beat.
   - Real-time scrolling active lyric line next to the companion with music note icon.
   - Colorful Source Pill badge:
     - `YouTube`: Red pill badge (`#ef4444`)
     - `Spotify`: Green pill badge (`#22c55e`)
     - `YouTube Music`: Crimson pill badge (`#dc2626`)
2. **Compact View (`CompactView.tsx`)**:
   - Displays live song info, green clock, and 5-bar animated waveform.
3. **Expanded Music Player (`MusicLyricsSlide.tsx`)**:
   - Renders real YouTube thumbnail / Spotify album art in the `66x66px` card.
   - Synced scrolling lyrics list with Dual Subtitle toggle.
   - Tabular time countdown and seek bar tied to real media duration.

---

## 3. Implementation Steps

| Step | Action | Files Modified |
| :---: | :--- | :--- |
| **1** | Update `Cargo.toml` with `base64` and `windows-sys` features (`Win32_System_Com`, `Win32_UI_Input_KeyboardAndMouse`) | `src-tauri/Cargo.toml` |
| **2** | Implement Dual-Engine media detector (Fixed WinRT SMTC + Win32 EnumWindows + Media Keys) | `src-tauri/src/media_session.rs` |
| **3** | Update TypeScript types & store to support `mediaThumbnail` and live media payload fields | `src/types/liquid.ts`, `src/store/useSystemStore.ts` |
| **4** | Enhance `liveLyricsFetcher.ts` with Smart YouTube Title cleaner, two-tier LRCLib query, and language heuristics | `src/utils/liveLyricsFetcher.ts` |
| **5** | Integrate live thumbnail, badges, and controls into `MusicLyricsSlide.tsx`, `CompanionStage.tsx`, and `CompactView.tsx` | `MusicLyricsSlide.tsx`, `CompanionStage.tsx`, `CompactView.tsx` |
| **6** | Verify Rust compilation (`cargo check`), TypeScript (`tsc`), and Vite build (`npm run build`) | Workspace verification |

---

## 4. Verification & Testing Checklist

- [ ] Rust backend builds with 0 errors via `cargo check`.
- [ ] SMTC engine iterates through sessions and catches playing Chrome/Edge/Brave/Spotify.
- [ ] Fallback Win32 window scanner detects visible YouTube / Spotify window titles.
- [ ] Media transport controls trigger both SMTC and virtual media key events.
- [ ] YouTube video titles like `"Artist - Title (Official Video)"` are cleaned and parsed.
- [ ] LRCLib returns synced lyrics with Indonesian subtitle translations.
- [ ] Live thumbnail renders in `MusicLyricsSlide.tsx`.
- [ ] Companion Stage displays the active lyric line and source badge in Notch mode.
- [ ] `npm run build` succeeds cleanly.
