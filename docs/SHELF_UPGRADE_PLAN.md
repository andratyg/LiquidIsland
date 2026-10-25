# SHELF UPGRADE & FULL DRAG-AND-DROP PLAN: 100% FUNCTIONAL & PREMIUM GLASS REDESIGN

## 1. Overview & Analysis
The user requested:
1. **"diperbagus dong"**: Make the Shelf slide visually stunning, matching the high-end macOS Sonoma / Sequoia Dynamic Island aesthetic. Redesign the dropzone, empty state, file cards, badges, and quick actions with frosted liquid glass, ambient glows, and crisp typography.
2. **"pastikan ini bisa di drop dan juga berfungsi dengan baik yang seharusnya"**: Ensure complete, bulletproof drag-and-drop functionality:
   - Dragging files from Windows Explorer or Desktop onto the Island / Shelf works reliably.
   - Hardware-level cursor approach detection in `window_manager.rs` covers the full expanded height (`250px`) so click-through never blocks the drop.
   - Dropped local images display real, high-resolution thumbnails via Tauri v2's `convertFileSrc`.
   - Real file sizes and extensions are extracted via Rust's `inspect_dropped_file`.
   - Dropping web images from browsers, URLs/links, and text/code selections is fully supported.
   - Clicking "Browse" or the dropzone opens the native Windows file picker (`<input type="file" multiple>`) for 1-click file browsing.
   - 1-click "Paste Clipboard" action to instantly capture copied items.
   - All card actions (Compress -65%, Convert to WEBP/PNG, Reveal in Explorer, Copy Path/Text, Delete, Clear all) are 100% operational.

---

## 2. Technical Architecture & Modifications

### A. Rust Window Manager (`src-tauri/src/window_manager.rs`)
- Expand `approach_y_max` from `win_pos.y + 90` to `win_pos.y + (250.0 * scale).round() as i32`.
- Expand `approach_x_max` from `320.0 * scale` to `(380.0 * scale).round() as i32`.
- Ensure `CURRENT_IGNORE_STATE` remains `false` while dragging approach is active so drop events are never intercepted or swallowed by click-through.

### B. Rust File Inspection & Explorer Integration (`src-tauri/src/app_launcher.rs` & `src-tauri/src/lib.rs`)
- Add `inspect_dropped_file(path: String) -> FileMetadataInfo`:
  - Returns real file size in bytes and formatted string (e.g. `2.4 MB`, `850 KB`), extension, whether it's an image, text, or binary, and for text files < 500KB extracts the first 400 characters for instant snippet display.
- Add `open_file_in_explorer(path: String) -> bool`:
  - Executes `explorer.exe /select,"<path>"` with `CREATE_NO_WINDOW` to highlight the file directly in Windows File Explorer.
- Add `open_file_default(path: String) -> bool`:
  - Opens the file with the default Windows application.
- Expose these commands in `tauri::generate_handler!`.

### C. Island Shell Integration (`src/components/IslandShell.tsx`)
- In `onDragDropEvent`:
  - When `payload.type === 'drop'` and `payload.paths` are present:
    - For each file path, call `inspect_dropped_file` (with clean fallback if outside Tauri).
    - If image, generate `previewUrl` via `convertFileSrc(filePath)` from `@tauri-apps/api/core`.
    - If text/code, populate `content` with the snippet preview.
    - Set accurate size, formattedSize, extension, and timestamp.
    - Add to `systemStore.addShelfFile`.
    - Play `playGlassPop()` sound and wake Shelf slide.

### D. Shelf Slide Redesign (`src/components/slides/ShelfSlide.tsx`)
- **Universal Drop Target Box (Left):**
  - Dimensions: `130px` width, `88px` height.
  - Border: Animated dashed border with liquid blue glow when `isDragOver` (`rgba(59, 130, 246, 0.85)` + outer glow).
  - Background: Frosted glass gradient `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`.
  - Icon: Squircle badge with folder download icon.
  - Labels: "Drop anything here" + "Files, Photos, Links, Text".
  - Actions:
    - `Browse` button: Triggers real native file picker with 1 click.
    - `Paste` button: Captures current clipboard contents immediately.
- **Empty State (Right):**
  - Modern empty state card with floating layer icons, friendly subtitle, and quick sample test buttons (`+ Add beach.jpg` for compression demo, `+ Add Snippet` for code copy demo).
- **File Cards (Right, Scrollable):**
  - `260px` width, `88px` height, rounded squircle corners (`14px`), dark frosted glass with subtle border glow.
  - Left preview container: 66x66px rounded squircle showing the actual high-resolution image preview, code snippet preview, globe icon for URLs, or colored doc icon for files.
  - Bottom-left tag pill on thumbnail (`PNG`, `JPG`, `CODE`, `URL`, `PDF`, etc.).
  - Right info column:
    - Bold filename with truncation and title tooltip.
    - Real file size (or line count / characters), with green `-65%` tag when compressed.
    - Quick actions:
      - Images: `⚡ Compress (-65%)`, `⇄ PNG/WEBP`, `📥 Download`, `🗑 Delete`.
      - Local Files: `📂 Reveal`, `📋 Copy Path`, `🗑 Delete`.
      - Text / Code: `📋 Copy Text`, `🗑 Delete`.
      - URLs: `📋 Copy`, `↗ Open`, `🗑 Delete`.
  - Card is draggable (`draggable={true}`) so users can drag items back out of the Shelf.

### E. Expanded Container Header (`src/components/ExpandedContainer.tsx`)
- In header bar when `activeSlide === 3`:
  - Show item count badge: `Shelf (N)`.
  - Add quick `+ Browse` pill alongside `Clear`.

---

## 3. Verification Steps
1. Run `cargo check --manifest-path src-tauri/Cargo.toml` to ensure Rust backend compiles cleanly.
2. Run `npx tsc --noEmit` to verify all TypeScript types.
3. Run `npm run build` to verify Vite bundle compilation.
