# Phase 7 Implementation Plan: Smart Shelf File Dropzone + Quick Image Converter (Slide 4) & TodoList (Slide 5)

## Executive Summary
Phase 7 implements the **Smart Shelf File Dropzone with Quick Image Converter (Slide 4, `activeSlide = 3`)** and the **TodoList Module (Slide 5, `activeSlide = 4`)** for LiquidIsland OS, matching `00:12–00:18` of the reference video.

This phase completes all 5 slides of the Expanded Carousel (`0` to `4`), fully satisfying:
1. **Smart Drag Auto-Wake Choreography**: Dragging an OS file toward the top of the screen automatically expands the Dynamic Island from idle (`compact`, `eyes`, or `bezel-line`) directly into `expanded` mode on Slide 4 (`activeSlide = 3`), alerting companions (`Slime` open mouth anticipation, `Cat` pounce/dilated alert) via `isDraggingFile = true`.
2. **Shelf Dropzone & Jelly Bounce Reception**: Left dropzone (`124px × 86px`) with dashed glass borders, click-to-browse fallback, and a one-click test simulator. Dropping files activates springy jelly bounce physics on the Island shell, flashes companion file-catch satisfaction, and triggers `playGlassPop()`.
3. **Zero-Dependency HTML5 `<canvas>` Image Converter & Compressor**: Built-in micro-tools directly on Shelf file cards to compress image size (e.g. `2.4 MB ➔ 840 KB`, -65% reduction) and convert formats (`WEBP ⇄ PNG`) with zero runtime libraries.
4. **Header "Clear" Integration**: Dynamic header in `ExpandedContainer.tsx` reveals the `"Clear"` action pill next to `"Shelf"` when on Slide 3, matching `00:17` of the video.
5. **Persistent Emerald TodoList Module**: Matches `00:13–00:15` with a `138px` left summary column showing dynamic ratio counter `"4/5"` (`"Task Done Today"`), `"+ Add Task"` and `"✎ Edit Task"` controls, and right-hand scrollable emerald translucent task pills with circular checkmark toggles, fully synchronized with `localStorage`.

---

## 1. Architecture & Component Hierarchy

```
d:\LiquidIsland\
├── docs/
│   ├── ARCHITECTURE_LOCK.md
│   ├── PHASE_5_PLAN.md
│   └── PHASE_7_PLAN.md                  # [THIS DOCUMENT] Phase 7 Implementation Plan
├── src/
│   ├── types/
│   │   └── liquid.ts                    # ShelfFileItem, TodoTaskItem, SystemSettings extensions
│   ├── store/
│   │   └── useSystemStore.ts            # Persistent CRUD operations for shelf files & todo tasks
│   ├── utils/
│   │   ├── sfx.ts                       # Preserved sound effects
│   │   └── imageConverter.ts            # HTML5 Canvas compression & WEBP/PNG format converter
│   ├── styles/
│   │   └── liquid-glass.css             # Dropzone dashes, emerald task pill glass tokens, bounce keyframes
│   ├── components/
│   │   ├── IslandShell.tsx              # Springy jelly drop bounce trigger
│   │   ├── ExpandedContainer.tsx        # Header "Clear" button for Shelf, Slide 3 & 4 mounting
│   │   ├── companions/
│   │   │   └── CompanionStage.tsx       # Drag enter auto-wake triggers
│   │   └── slides/
│   │       ├── ShelfSlide.tsx           # [NEW] Slide 3: Dropzone, Beach image card, Compressor, WEBP/PNG
│   │       └── TodoSlide.tsx            # [NEW] Slide 4: 138px Summary, Dynamic "4/5", Emerald Task Pills
│   └── App.tsx                          # Global file drag auto-wake coordinator & Dev Toolbar testing triggers
```

---

## 2. Technical Specifications & Choreography

### 2.1 Smart Drag Auto-Wake Choreography
- **Detection**:
  - Global `dragenter` and `dragover` listeners detect incoming OS file drag operations (`e.dataTransfer.types.includes('Files')`).
  - When a file drag is detected near the upper viewport region (`e.clientY < 190` or over the Island bounds):
    - `systemStore.setIslandState('expanded')` is invoked.
    - `systemStore.setActiveSlide(3)` is activated so the dropzone is immediately exposed.
    - `isDraggingFile` is set to `true`, triggering Slime mouth stretch and Cat dilated pounce alert.
  - When dragging leaves the window or cancels (`dragleave` counter reaches 0), drag states reset smoothly.
- **Drop Reception & Jelly Bounce**:
  - Dropping files directly on the Shelf dropzone box or expanded shell calls `e.preventDefault()`.
  - Triggers springy Island shell jelly bounce:
    ```typescript
    animate: { scaleX: [1, 1.05, 0.96, 1.02, 1], scaleY: [1, 0.94, 1.05, 0.98, 1] }
    ```
  - Flashes companion catch animation badge `"Caught <filename>! 🌟"` and plays `playGlassPop()`.

### 2.2 Shelf Dropzone Box & Beach File Card (`ShelfSlide.tsx`)
- **Left Dropzone (`124px × 86px`)**:
  - Border: `1.5px dashed rgba(255, 255, 255, 0.22)` with hover state `border-color: #3b82f6`.
  - Icon: Lucide `UploadCloud` / `FolderDown`.
  - Label: `"Drop files here"`.
  - Sub-actions: Hidden `<input type="file" multiple accept="image/*,*" />` for click-to-browse, and a `"Simulate Drop beach.jpg"` button for instantaneous test-bench execution.
- **Right File Cards List**:
  - Seeded default item: Sunset beach vector/image, filename `"beach.jpg"`, size `"2.4 MB"`, remove `×` button.
  - **Quick Compressor (`⚡ Compress (-65%)`)**:
    - Draws image onto an in-memory `<canvas>` element.
    - Compresses via `canvas.toBlob(blob, 'image/jpeg', 0.42)`.
    - Updates file card state with new size (e.g. `2.4 MB ➔ 840 KB`) and displays a green `(-65%)` savings badge.
  - **Format Converter (`⇄ WEBP / PNG`)**:
    - Converts file format via `canvas.toDataURL('image/webp', 0.92)` or `'image/png'`.
    - Triggers direct client download or clipboard copy with confirmation toast.
- **Top Header Action**:
  - When `activeSlide === 3`, `ExpandedContainer.tsx` displays `"Clear"` next to `"Shelf"`. Clicking `"Clear"` removes all items with `playWaterDrop()` SFX.

### 2.3 Persistent Emerald TodoList Module (`TodoSlide.tsx`)
- **Left Summary Column (`138px` width)**:
  - Big bold ratio counter: `"4/5"` (dynamically calculated: `${completedCount}/${totalCount}`).
  - Subtitle: `"Task Done Today"` in `var(--text-secondary)`.
  - Action button 1: `"+ Add Task"` (opens sleek inline glass text input; pressing Enter commits task).
  - Action button 2: `"✎ Edit Task"` (toggles task edit mode with individual remove `×` buttons).
- **Right Scrollable Emerald Task Pills**:
  - Seeded with 5 tasks (exact 3 from video + 2 completed to establish initial `4/5` ratio):
    1. `"Revise the report"` (✓ Completed)
    2. `"Reply to Dina"` (✓ Completed)
    3. `"Post weekly update"` (✓ Completed)
    4. `"Design sprint review"` (✓ Completed)
    5. `"Prepare slide deck"` (Pending)
  - Styling:
    - Background: `rgba(34, 197, 94, 0.22)`
    - Border: `1px solid rgba(34, 197, 94, 0.38)`
    - Hover: `background: rgba(34, 197, 94, 0.32)`
  - Circular Checkmark Toggle (`✓`):
    - 18px rounded pill on the right of each task item.
    - Completed: Solid emerald fill `#22c55e` with white checkmark.
    - Pending: Translucent ring with dim dot.
    - Clicking toggles completion, updates counter immediately, and plays `playWaterDrop()`.
- **Persistence**:
  - All additions, edits, deletions, and checkbox toggles automatically write to `localStorage` under `liquidisland_os_state_v1`.

### 2.4 Strict DOM Unmounting & Memory Lock
- `ExpandedContainer.tsx` conditionally mounts:
  - Slide 0: `<MusicLyricsSlide />`
  - Slide 1: `<SlidePlaceholder index={1} />` (Pomodoro)
  - Slide 2: `<SlidePlaceholder index={2} />` (Water Reminder)
  - Slide 3: `<ShelfSlide />`
  - Slide 4: `<TodoSlide />`
- Only the active slide is mounted in the DOM. Unmounted slides drop all listeners and image canvases, ensuring physical working set remains around the ~8–10 MB RAM target.

---

## 3. Step-by-Step Implementation Sequence
1. **Extend Types (`src/types/liquid.ts`)**: Add `ShelfFileItem`, `TodoTaskItem`, and update `SystemSettings`.
2. **Enhance System Store (`src/store/useSystemStore.ts`)**: Add CRUD state and actions for Shelf files and Todo tasks with `localStorage` synchronization.
3. **Canvas Image Utility (`src/utils/imageConverter.ts`)**: Implement pure HTML5 canvas compressor and WEBP/PNG converter with high-quality sunset beach vector fallback.
4. **Build Slide 4 (`src/components/slides/ShelfSlide.tsx`)**: Implement dropzone, dragover animations, simulate drop trigger, beach card, canvas compressor, and format converter.
5. **Build Slide 5 (`src/components/slides/TodoSlide.tsx`)**: Implement 138px summary, `"4/5"` dynamic counter, inline add/edit task inputs, and emerald translucent task pills.
6. **Update Header & Carousel Wiring (`src/components/ExpandedContainer.tsx`)**: Mount `ShelfSlide` and `TodoSlide`, wire up `"Clear"` header button for Shelf.
7. **Global Drag Auto-Wake Coordinator (`src/App.tsx` & `src/components/IslandShell.tsx`)**: Global drag listeners that wake into `expanded` on Slide 3 with companion anticipation, jelly bounce trigger on drop.
8. **Styles & Verification (`src/styles/liquid-glass.css`)**: Add styling for dropzone dashes, emerald task pill tokens, and jelly drop bounce keyframes. Run test build and verify zero regressions.
