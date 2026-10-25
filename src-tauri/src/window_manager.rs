use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::time::Duration;
use tauri::{Emitter, PhysicalPosition, Position, Window};

#[cfg(windows)]
use windows_sys::Win32::Foundation::POINT;
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;

pub static HIT_WIDTH: AtomicU32 = AtomicU32::new(210);
pub static HIT_HEIGHT: AtomicU32 = AtomicU32::new(56);
pub static HIT_MODAL_OPEN: AtomicBool = AtomicBool::new(false);
pub static CURRENT_IGNORE_STATE: AtomicBool = AtomicBool::new(false);
pub static HIT_LOOP_STARTED: AtomicBool = AtomicBool::new(false);
pub static PREV_CURSOR_INSIDE: AtomicBool = AtomicBool::new(false);

/// Updates the dynamic hit box for the Dynamic Island and modals.
/// Called by React whenever islandState, lyrics, audio, or modals change.
#[tauri::command]
pub fn update_hit_box(width: u32, height: u32, modal_open: bool) {
    HIT_WIDTH.store(width, Ordering::Relaxed);
    HIT_HEIGHT.store(height, Ordering::Relaxed);
    HIT_MODAL_OPEN.store(modal_open, Ordering::Relaxed);
}

/// Spawns a background thread (polling every 35ms) using Win32 GetCursorPos to perform
/// hardware-level hit testing, switching set_ignore_cursor_events(false/true) dynamically,
/// and emitting "cursor-in-island" (bool) to React for 100% reliable auto-expand & auto-shrink.
pub fn start_hit_test_loop(window: Window) {
    if HIT_LOOP_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        #[cfg(windows)]
        let mut pt: POINT = unsafe { std::mem::zeroed() };

        loop {
            std::thread::sleep(Duration::from_millis(35));

            let modal_open = HIT_MODAL_OPEN.load(Ordering::Relaxed);
            let box_w = HIT_WIDTH.load(Ordering::Relaxed);
            let box_h = HIT_HEIGHT.load(Ordering::Relaxed);

            let is_inside = if modal_open {
                // If a modal or dev dock is open, allow interaction across the window
                true
            } else {
                #[cfg(windows)]
                {
                    let success = unsafe { GetCursorPos(&mut pt) };
                    if success == 0 {
                        false
                    } else {
                        let win_pos = match window.outer_position() {
                            Ok(pos) => pos,
                            Err(_) => continue,
                        };
                        let win_size = match window.outer_size() {
                            Ok(size) => size,
                            Err(_) => continue,
                        };
                        let scale = window.scale_factor().unwrap_or(1.0);

                        let physical_box_w = (box_w as f64 * scale).round() as i32;
                        let physical_box_h = (box_h as f64 * scale).round() as i32;
                        let margin = (16.0 * scale).round() as i32;

                        let win_center_x = win_pos.x + (win_size.width as i32 / 2);
                        let island_left = win_center_x - (physical_box_w / 2) - margin;
                        let island_right = win_center_x + (physical_box_w / 2) + margin;
                        let island_top = win_pos.y;
                        let island_bottom = win_pos.y + physical_box_h + margin;

                        // Check if cursor is inside island bounds
                        let inside_island = pt.x >= island_left
                            && pt.x <= island_right
                            && pt.y >= island_top
                            && pt.y <= island_bottom;

                        // Stealth Mode (bezel-line) Auto-Wake hit detection:
                        // Top bezel strip (y <= 14px relative to screen, centered horizontally)
                        let bezel_margin_x = (100.0 * scale).round() as i32;
                        let bezel_bottom = win_pos.y + (14.0 * scale).round() as i32;
                        let inside_bezel = pt.y >= win_pos.y
                            && pt.y <= bezel_bottom
                            && pt.x >= (win_center_x - bezel_margin_x)
                            && pt.x <= (win_center_x + bezel_margin_x);

                        inside_island || inside_bezel
                    }
                }

                #[cfg(not(windows))]
                {
                    true
                }
            };

            let should_ignore = !is_inside;
            let current_ignore = CURRENT_IGNORE_STATE.load(Ordering::Relaxed);
            if should_ignore != current_ignore {
                if window.set_ignore_cursor_events(should_ignore).is_ok() {
                    CURRENT_IGNORE_STATE.store(should_ignore, Ordering::Relaxed);
                }
            }

            let prev_inside = PREV_CURSOR_INSIDE.load(Ordering::Relaxed);
            if is_inside != prev_inside {
                PREV_CURSOR_INSIDE.store(is_inside, Ordering::Relaxed);
                let _ = window.emit("cursor-in-island", is_inside);
            }
        }
    });
}

/// Enables or disables cursor pass-through on transparent window regions manually.
#[tauri::command]
pub fn set_click_through(window: Window, ignore: bool) -> Result<(), String> {
    CURRENT_IGNORE_STATE.store(ignore, Ordering::Relaxed);
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| format!("Failed to set ignore_cursor_events({}): {}", ignore, e))
}

/// Centers the LiquidIsland overlay horizontally on the specified monitor index
/// and positions it flush with the top bezel (y: 0 relative to target monitor).
#[tauri::command]
pub fn center_on_monitor(window: Window, monitor_index: usize) -> Result<(), String> {
    let monitors = window
        .available_monitors()
        .map_err(|e| format!("Failed to query available monitors: {}", e))?;

    if monitors.is_empty() {
        return Err("No available monitors found".to_string());
    }

    let target_monitor = monitors
        .get(monitor_index)
        .or_else(|| monitors.first())
        .ok_or_else(|| "Could not select target monitor".to_string())?;

    let monitor_pos = target_monitor.position();
    let monitor_size = target_monitor.size();
    let window_size = window
        .outer_size()
        .map_err(|e| format!("Failed to get window outer size: {}", e))?;

    let center_x = monitor_pos.x + ((monitor_size.width as i32 - window_size.width as i32) / 2);
    let top_y = monitor_pos.y; // Flush against top bezel (y: 0)

    window
        .set_position(Position::Physical(PhysicalPosition {
            x: center_x,
            y: top_y,
        }))
        .map_err(|e| format!("Failed to set window position: {}", e))?;

    Ok(())
}

/// Returns a human-readable list of connected monitors with names, resolutions, and coordinates.
#[tauri::command]
pub fn get_monitors_list(window: Window) -> Vec<String> {
    let monitors = window.available_monitors().unwrap_or_default();
    monitors
        .into_iter()
        .enumerate()
        .map(|(idx, m)| {
            let name = m
                .name()
                .cloned()
                .unwrap_or_else(|| format!("Display {}", idx + 1));
            let size = m.size();
            let pos = m.position();
            let scale = m.scale_factor();
            format!(
                "{}: {} ({}x{} at {},{}, scale: {:.1})",
                idx, name, size.width, size.height, pos.x, pos.y, scale
            )
        })
        .collect()
}

/// Adjusts the overlay window size dynamically (e.g. expanding vertically from 210px to 960px
/// when Spotlight or Settings modals open so glass panels appear beautifully in the center of the screen).
#[tauri::command]
pub fn set_window_size(window: Window, width: u32, height: u32) -> Result<(), String> {
    let _ = window.set_resizable(true);
    let scale = window.scale_factor().unwrap_or(1.0);
    let (target_w, target_h, center_x, top_y) = if let Ok(Some(monitor)) = window.current_monitor() {
        let mon_w = (monitor.size().width as f64 / scale) as u32;
        let mon_h = (monitor.size().height as f64 / scale) as u32;
        let mon_pos = monitor.position();

        let w = width.min(mon_w);
        let h = height.min(mon_h.saturating_sub(40));

        let phys_w = (w as f64 * scale).round() as i32;
        let cx = mon_pos.x + ((monitor.size().width as i32 - phys_w) / 2);
        let cy = mon_pos.y;

        (w, h, cx, cy)
    } else {
        (width, height, 0, 0)
    };

    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: target_w as f64,
            height: target_h as f64,
        }))
        .map_err(|e| format!("Failed to set window size: {}", e))?;

    if target_w > 0 {
        let _ = window.set_position(Position::Physical(PhysicalPosition {
            x: center_x,
            y: top_y,
        }));
    }

    Ok(())
}
