use tauri::{PhysicalPosition, Position, Window};

/// Enables or disables cursor pass-through on transparent window regions.
/// When `ignore` is true, cursor events pass directly through transparent pixels to underlying windows.
#[tauri::command]
pub fn set_click_through(window: Window, ignore: bool) -> Result<(), String> {
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

/// Adjusts the overlay window size dynamically (e.g. expanding vertically from 210px to 620px
/// when Spotlight or Settings modals open so 620px glass panels are never clipped).
#[tauri::command]
pub fn set_window_size(window: Window, width: u32, height: u32) -> Result<(), String> {
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: width as f64,
            height: height as f64,
        }))
        .map_err(|e| format!("Failed to set window size: {}", e))
}

