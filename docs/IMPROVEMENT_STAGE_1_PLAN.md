# Improvement Stage 1 Implementation Plan: Universal Drag-to-Shelf (Text, Web Images, Links & Files) + Change Search Shortcut to Alt+S

## Executive Summary
This stage enhances multitasking and workflow speed with two major capabilities:
1. **Universal Drag-to-Shelf**:
   - Hardware-level cursor approach detection in Rust (`window_manager.rs`) detects when the user drags anything towards the Notch area while holding down the mouse button.
   - Notch immediately expands and auto-switches to the Shelf slide (`activeSlide = 3`).
   - The Shelf accepts all drop types: selected plain text / code snippets, dragged web images / HTML images, links / URLs, and local OS files / photos from Explorer.
2. **Global Spotlight Shortcut Migration to Alt + S**:
   - Migrates keyboard listeners in `App.tsx` and `SpotlightModal.tsx` from `Alt + Space` to `Alt + S`.
   - Adds global Win32 hotkey detection for `Alt + S` (`VK_MENU` + `0x53`) in `window_hooks.rs` so Spotlight can be summoned from anywhere in Windows even when other applications have foreground focus.
   - Updates UI shortcut badges across `TaskbarPreviewDock.tsx`, `SpotlightModal.tsx`, and `SettingsModal.tsx`.

---

## 1. Architectural Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Rust Tauri Backend                       │
│  src-tauri/src/window_manager.rs (35ms Loop):               │
│  - GetAsyncKeyState(VK_LBUTTON) held down                   │
│  - pt.y <= 90 && (pt.x - center_x).abs() <= 320             │
│  - window.set_ignore_cursor_events(false)                   │
│  - emit("drag-approach-shelf")                              │
│                                                             │
│  src-tauri/src/window_hooks.rs:                             │
│  - GetAsyncKeyState(VK_MENU) && GetAsyncKeyState(0x53)      │
│  - emit("open-spotlight") globally                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
       Tauri Events: "drag-approach-shelf", "open-spotlight"
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    React Frontend Shell                     │
│  src/components/IslandShell.tsx:                            │
│  - On "drag-approach-shelf" or dragenter/dragover:          │
│    systemStore.wakeShelfForDrop() (expanded + slide 3)      │
│    isDraggingRef = true (pause auto-shrink)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Universal Shelf Drop                     │
│  src/components/slides/ShelfSlide.tsx:                      │
│  1. Text Drop -> kind: 'text', character count, Copy Text   │
│  2. Web Image Drop -> HTML img src / uri-list, Preview, Copy│
│  3. Link Drop -> URL, Copy Link, Open in Browser            │
│  4. File Drop -> Local files, thumbnails, download/compress │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Specifications

### Component A: Rust Drag-Approach Detector (`src-tauri/src/window_manager.rs`)
- In `start_hit_test_loop(window: Window)`:
  - Check `GetAsyncKeyState(0x01)` (`VK_LBUTTON` held down).
  - Check cursor position: `pt.y <= 90` and `(pt.x - win_center_x).abs() <= 320`.
  - When true and not previously approaching:
    - Call `window.set_ignore_cursor_events(false)`.
    - Emit `"drag-approach-shelf"`.
    - Mark `is_drag_approaching = true`.
  - When cursor exits zone or mouse button is released (`!lbutton_down`):
    - Reset `is_drag_approaching = false`.

### Component B: Auto-Switch to Shelf (`src/components/IslandShell.tsx`)
- Listen to `"drag-approach-shelf"` event from Tauri IPC:
  - Calls `systemStore.wakeShelfForDrop()` (`islandState = 'expanded'`, `activeSlide = 3`).
  - Sets `isDraggingRef.current = true` to suppress auto-shrink timer until drop or mouse leave.
- In `window.addEventListener('dragenter')` and `dragover`:
  - Activates for ALL dataTransfer types (text, html, uri-list, files).

### Component C: Universal Drop Handler (`src/components/slides/ShelfSlide.tsx`)
- In `handleDrop(e: React.DragEvent)`:
  1. **Files**: If `e.dataTransfer.files && e.dataTransfer.files.length > 0`, process local files using `FileReader`.
  2. **Web Images (HTML)**: Read `e.dataTransfer.getData('text/html')`. Parse `<img[^>]+src=["']([^"']+)["']`. Create Shelf item with `type: 'image/web'` and live thumbnail.
  3. **Links (URI List)**: Read `e.dataTransfer.getData('text/uri-list')`. If valid HTTP/HTTPS URL, create Shelf item with `type: 'url'`.
  4. **Plain Text**: Read `e.dataTransfer.getData('text/plain')`. If non-empty, create Shelf item with `type: 'text/plain'`, formatted length (`X chars`), and 1-click copy action.
- Update UI rendering for text and URL cards in the Shelf slide with dedicated badges, character counts, and copy buttons.

### Component D: Global & Local Search Shortcut Migration to `Alt + S`
1. **Frontend Hotkey Listeners**:
   - `src/App.tsx`: Update `handleKeyDown` to trigger Spotlight on `e.altKey && (e.code === 'KeyS' || e.key === 's' || e.key === 'S')`.
   - `src/components/SpotlightModal.tsx`: Close / toggle on `Alt + S`.
2. **Global Win32 Hotkey in Rust (`src-tauri/src/window_hooks.rs`)**:
   - Check `(GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0` and `(GetAsyncKeyState(0x53) as u16 & 0x8000) != 0` (`0x53` = `'S'`).
   - Debounce to single trigger on press; emit `"open-spotlight"`.
3. **UI Badges & Tooltips**:
   - `src/components/TaskbarPreviewDock.tsx`: `"Alt+S"`.
   - `src/components/SpotlightModal.tsx`: `"Alt + S"`.

---

## 3. Verification Plan
1. **Rust Check**: `cargo check --manifest-path src-tauri/Cargo.toml` (0 warnings).
2. **TypeScript Compilation**: `npx tsc --noEmit` (0 errors).
3. **Frontend Production Build**: `npm run build` (clean output).
4. **Functional Drag & Drop Test**: Verify text drops, web image drops, URL drops, and file drops into Shelf.
5. **Shortcut Test**: Verify `Alt + S` toggles Spotlight cleanly.
