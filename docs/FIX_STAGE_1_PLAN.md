# Fix Stage 1 Implementation Plan: Lyrics Flickering Bug, Corrupted Taskbar App Icons & Redesigned Settings Dock Icon

## Executive Summary
Fix Stage 1 addresses three critical visual and functional bugs reported by the user:
1. **Lyric Flickering & Back-and-Forth Jumping (`00:11–00:14`)**:
   - Fixed the race condition between the frontend's local timer and Rust's `system-media-update` polling where truncated integer seconds caused `playbackTime` to repeatedly jump backwards by fractions of a second, causing lyric line oscillations between line $N$ and $N - 1$.
   - Switched Rust's `position_secs` and `duration_secs` to high-precision `f64`.
   - Introduced a **Monotonic Playback Guard** in `useSystemStore.ts` and `App.tsx` preventing backwards time syncs under 3.0s during continuous playback.
   - Smoothly stepped the local playback timer to `200ms` intervals (`+0.2s`) and implemented a `300ms` forward hysteresis in lyric indexing.
   - Removed `mode="wait"` in `CompanionStage.tsx` and replaced it with a seamless cross-slide transition (`initial={{ y: 8, opacity: 0 }}`, `animate={{ y: 0, opacity: 1 }}`, `exit={{ y: -8, opacity: 0 }}`) to eliminate black gap blinkouts.
2. **Corrupted / Cropped Taskbar App Icons (Image 6)**:
   - Fixed `extract_exe_icon_base64` in `src-tauri/src/taskbar.rs`. Replaced raw bitmap stride slicing with a clean 32x32 memory DC canvas and Win32 `DrawIconEx(mem_dc, 0, 0, hicon, 32, 32, 0, 0, DI_NORMAL)`.
   - `DrawIconEx` automatically downsamples and centers 16x16, 48x48, 64x64, and 256x256 icons cleanly.
   - Read pixels via `GetDIBits` with a negative height top-down `BITMAPINFOHEADER`, converted BGRA to RGBA, and encoded into lossless PNG base64 (`data:image/png;base64,...`).
3. **Redesigned Settings Dock Icon (Image 5)**:
   - Replaced the confusing purple circle with spokes with a sleek, unmistakable **macOS Control Center / Settings Sliders icon** in a refined frosted glass squircle with dual accent sliders and an instant hover badge (`"LiquidIsland Settings"`).

---

## 1. Technical Details & Root Cause Analysis

### 1.1 Lyrics Flickering & Race Condition Resolution
- **Files Modified**:
  - `src-tauri/src/media_session.rs`
  - `src/types/liquid.ts`
  - `src/store/useSystemStore.ts`
  - `src/App.tsx`
  - `src/utils/lyricsData.ts`
  - `src/components/slides/MusicLyricsSlide.tsx`
  - `src/components/companions/CompanionStage.tsx`
- **Root Cause**:
  1. In `src-tauri/src/media_session.rs`, `position_secs` was computed as `(timeline.Position().Duration / 10_000_000) as u64`. This integer truncation dropped fractional seconds.
  2. In `src/App.tsx`, a 1000ms `setInterval` advanced `playbackTime` in 1s increments.
  3. Every ~1000ms, Rust polled SMTC and emitted `"system-media-update"` with an integer position (e.g. 44.0s) while the frontend timer was already at 44.8s.
  4. `updateSystemMedia()` blindly overwrote `playbackTime: 44.0`, dropping `playbackTime` below the next lyric's threshold (e.g. 45.0s), reverting the lyric to the previous line. Seconds later, the frontend timer ticked past 45.0s again, causing the lyric to jump back and forth repeatedly.
  5. Furthermore, in `CompanionStage.tsx`, `<AnimatePresence mode="wait">` forced the exiting lyric to fade out completely before the new lyric started mounting, resulting in a black empty box on every lyric flip.
- **Architectural Solution**:
  1. **Floating-point Timestamps in Rust**:
     ```rust
     let pos = timeline.Position().map(|p| (p.Duration as f64) / 10_000_000.0).unwrap_or(0.0);
     let dur = if end > start { ((end - start) as f64) / 10_000_000.0 } else { 0.0 };
     ```
  2. **Monotonic Playback Guard in `useSystemStore.ts`**:
     When receiving a media update for the same playing track:
     If `incomingPosition < currentPlaybackTime` and `currentPlaybackTime - incomingPosition < 3.0`, ignore the backwards overwrite. Only accept backwards jumps if user explicitly seeked ($\ge 3.0\text{s}$) or changed tracks.
  3. **High-Precision Frontend Timer**:
     In `App.tsx`, advance `playbackTime` every 200ms by `+0.2s` for fluid, continuous progress.
  4. **300ms Forward Hysteresis**:
     In `MusicLyricsSlide.tsx` and `CompanionStage.tsx`, once lyric index $N$ becomes active, prevent falling back to $N - 1$ if `currentTime >= line[N].time - 0.3`.
  5. **Zero-Blackout Cross-Slide in `CompanionStage.tsx`**:
     Remove `mode="wait"` and use `initial={{ y: 8, opacity: 0 }}`, `animate={{ y: 0, opacity: 1 }}`, `exit={{ y: -8, opacity: 0 }}`.

---

### 1.2 Taskbar App Icon Scaling & Centering
- **Files Modified**:
  - `src-tauri/Cargo.toml` (Add `png = "0.18"`)
  - `src-tauri/src/taskbar.rs`
- **Root Cause**:
  `GetIconInfo` on Windows returns icons at system DPI (48x48, 64x64, or 256x256). The previous implementation called `GetDIBits` directly on the raw `hbmColor` with a hardcoded 32x32 `BITMAPINFOHEADER`. Because `GetDIBits` does not scale bitmaps, it clipped only the top-left 32x32 corner, causing icons to appear zoomed-in and cropped.
- **Architectural Solution**:
  1. Allocate a 32x32 32-bit compatible bitmap on a screen-compatible DC:
     ```rust
     let screen_dc = GetDC(std::ptr::null_mut());
     let mem_dc = CreateCompatibleDC(screen_dc);
     let hbitmap = CreateCompatibleBitmap(screen_dc, 32, 32);
     let old_bmp = SelectObject(mem_dc, hbitmap);
     ```
  2. Call `DrawIconEx(mem_dc, 0, 0, hicon, 32, 32, 0, std::ptr::null_mut(), DI_NORMAL)` to scale and render the full icon with proper alpha.
  3. Retrieve top-down 32-bit BGRA pixels using `GetDIBits(..., biHeight = -32)`.
  4. Convert BGRA to RGBA (with alpha sanity fallback for older 24-bit icons).
  5. Encode into PNG base64 via `png::Encoder` and cache in `ICON_CACHE`.

---

### 1.3 Redesigned Settings Dock Icon
- **Files Modified**:
  - `src/components/TaskbarPreviewDock.tsx`
- **Design Specifications**:
  - Replace the obscure purple spoke circle with `SettingsControlCenterIcon`:
    - A frosted glass squircle backdrop (`rx="7.5"`).
    - Top horizontal slider track with blue gradient accent (`#38bdf8` to `#3b82f6`) and white knob.
    - Bottom horizontal slider track with purple/indigo gradient accent (`#a855f7` to `#6366f1`) and white knob.
  - Hover badge: Instant tooltip reading `"LiquidIsland Settings"` matching the Dock's Apple-style glass appearance.

---

## 2. Step-by-Step Implementation Checklist

1. [x] Inspect existing files (`media_session.rs`, `taskbar.rs`, `useSystemStore.ts`, `CompanionStage.tsx`, `MusicLyricsSlide.tsx`, `TaskbarPreviewDock.tsx`).
2. [ ] Update `src-tauri/Cargo.toml` to add `png = "0.18"`.
3. [ ] Update `src-tauri/src/media_session.rs` to compute `position_secs` and `duration_secs` as `f64`.
4. [ ] Update `src-tauri/src/taskbar.rs` to implement `DrawIconEx` scaling and PNG encoding in `extract_exe_icon_base64`.
5. [ ] Update `src/store/useSystemStore.ts` with Monotonic Playback Guard and 0.2s `tickPlaybackTime`.
6. [ ] Update `src/App.tsx` with high-precision 200ms interval timer.
7. [ ] Update `src/utils/lyricsData.ts` and `src/components/slides/MusicLyricsSlide.tsx` with 300ms forward hysteresis.
8. [ ] Update `src/components/companions/CompanionStage.tsx` to remove `mode="wait"` and add smooth cross-slide transitions.
9. [ ] Update `src/components/TaskbarPreviewDock.tsx` with `SettingsControlCenterIcon` and hover badge.
10. [ ] Verify compilation with `cargo check` and `npm run build`.
