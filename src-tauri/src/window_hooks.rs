//! LiquidIsland OS - Native Win32 Multitasking & Window Hooks (Phase 8 & Stage 2)
//! Provides foreground window pinning, fullscreen gaming detection, and
//! real-time tab-switch, app-switch, and virtual desktop switch activity detection.

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{Emitter, Window};

#[cfg(windows)]
use windows_sys::Win32::Foundation::{BOOL, HWND, RECT};
#[cfg(windows)]
use windows_sys::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, VK_CONTROL, VK_LEFT, VK_LWIN, VK_RIGHT, VK_RWIN,
};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowLongW, GetWindowRect,
    GetWindowTextW, GetWindowThreadProcessId, SetWindowPos, GWL_EXSTYLE, HWND_NOTOPMOST,
    HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, WS_EX_TOPMOST,
};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WorkspaceActivityPayload {
    pub kind: String,              // "tab-switch" | "app-switch" | "desktop-switch"
    pub app_name: String,          // e.g. "Google Chrome", "VS Code"
    pub tab_title: String,         // Cleaned tab or document title
    pub direction: Option<String>, // "left" | "right" for desktop-switch
    pub accent_color: String,      // Color token
}

pub static WORKSPACE_LISTENER_STARTED: AtomicBool = AtomicBool::new(false);

/// Helper to parse app name, clean tab title, and accent color from window title
pub fn parse_window_activity(raw: &str) -> (String, String, String) {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return ("Desktop".to_string(), "Desktop".to_string(), "#38bdf8".to_string());
    }

    // 1. YouTube / YouTube Music in any browser
    if trimmed.contains(" - YouTube Music") {
        let title = trimmed.replace(" - YouTube Music", "");
        let clean = strip_browser_suffixes(&title);
        return ("YouTube Music".to_string(), clean, "#dc2626".to_string());
    }
    if trimmed.contains(" - YouTube") {
        let title = trimmed.replace(" - YouTube", "");
        let clean = strip_browser_suffixes(&title);
        return ("YouTube".to_string(), clean, "#ef4444".to_string());
    }

    // 2. IDEs: VS Code / Cursor / Antigravity
    if trimmed.ends_with(" - Visual Studio Code") {
        let rest = &trimmed[..trimmed.len() - " - Visual Studio Code".len()];
        let parts: Vec<&str> = rest.split(" - ").collect();
        let tab = parts.first().unwrap_or(&rest).trim();
        return ("VS Code".to_string(), tab.to_string(), "#007acc".to_string());
    }
    if trimmed.ends_with(" - Cursor") {
        let rest = &trimmed[..trimmed.len() - " - Cursor".len()];
        let parts: Vec<&str> = rest.split(" - ").collect();
        let tab = parts.first().unwrap_or(&rest).trim();
        return ("Cursor".to_string(), tab.to_string(), "#8b5cf6".to_string());
    }
    if trimmed.ends_with(" - Antigravity") {
        let rest = &trimmed[..trimmed.len() - " - Antigravity".len()];
        let parts: Vec<&str> = rest.split(" - ").collect();
        let tab = parts.first().unwrap_or(&rest).trim();
        return ("Antigravity".to_string(), tab.to_string(), "#6366f1".to_string());
    }

    // 3. Browsers
    if trimmed.ends_with(" - Google Chrome") {
        let tab = &trimmed[..trimmed.len() - " - Google Chrome".len()];
        return ("Google Chrome".to_string(), tab.trim().to_string(), "#4285f4".to_string());
    }
    if trimmed.ends_with(" - Microsoft Edge") {
        let mut tab = &trimmed[..trimmed.len() - " - Microsoft Edge".len()];
        if let Some(pos) = tab.find(" and ") {
            if tab.contains("more pages") {
                tab = &tab[..pos];
            }
        }
        return ("Microsoft Edge".to_string(), tab.trim().to_string(), "#0078d7".to_string());
    }
    if trimmed.ends_with(" - Brave") {
        let tab = &trimmed[..trimmed.len() - " - Brave".len()];
        return ("Brave".to_string(), tab.trim().to_string(), "#fb542b".to_string());
    }
    if trimmed.ends_with(" — Mozilla Firefox") || trimmed.ends_with(" - Mozilla Firefox") {
        let tab = if trimmed.ends_with(" — Mozilla Firefox") {
            &trimmed[..trimmed.len() - " — Mozilla Firefox".len()]
        } else {
            &trimmed[..trimmed.len() - " - Mozilla Firefox".len()]
        };
        return ("Firefox".to_string(), tab.trim().to_string(), "#ff7139".to_string());
    }
    if trimmed.ends_with(" - Opera") {
        let tab = &trimmed[..trimmed.len() - " - Opera".len()];
        return ("Opera".to_string(), tab.trim().to_string(), "#ff1b2d".to_string());
    }

    // 4. Productivity & Communication Apps
    if trimmed.ends_with(" - Discord") {
        let tab = &trimmed[..trimmed.len() - " - Discord".len()];
        return ("Discord".to_string(), tab.trim().to_string(), "#5865f2".to_string());
    }
    if trimmed.ends_with(" - Slack") {
        let tab = &trimmed[..trimmed.len() - " - Slack".len()];
        return ("Slack".to_string(), tab.trim().to_string(), "#4a154b".to_string());
    }
    if trimmed == "Spotify Free" || trimmed == "Spotify Premium" || trimmed == "Spotify" {
        return ("Spotify".to_string(), "Spotify".to_string(), "#22c55e".to_string());
    }
    if trimmed.ends_with(" - Windows Terminal") {
        let tab = &trimmed[..trimmed.len() - " - Windows Terminal".len()];
        return ("Terminal".to_string(), tab.trim().to_string(), "#4ade80".to_string());
    }
    if trimmed.ends_with(" - File Explorer") {
        let tab = &trimmed[..trimmed.len() - " - File Explorer".len()];
        return ("File Explorer".to_string(), tab.trim().to_string(), "#f59e0b".to_string());
    }

    // 5. Fallback split on last hyphen
    if let Some(idx) = trimmed.rfind(" - ") {
        let tab = trimmed[..idx].trim().to_string();
        let app = trimmed[idx + 3..].trim().to_string();
        if !app.is_empty() {
            return (app, tab, "#38bdf8".to_string());
        }
    }

    ("App".to_string(), trimmed.to_string(), "#38bdf8".to_string())
}

fn strip_browser_suffixes(s: &str) -> String {
    let mut clean = s.to_string();
    let suffixes = [
        " - Google Chrome",
        " - Microsoft Edge",
        " - Brave",
        " - Mozilla Firefox",
        " — Mozilla Firefox",
        " - Opera",
    ];
    for suf in suffixes {
        if clean.ends_with(suf) {
            clean = clean[..clean.len() - suf.len()].to_string();
        }
    }
    clean.trim().to_string()
}

/// Starts the real-time tab switch, app switch & virtual desktop detector (200ms polling).
pub fn start_workspace_activity_listener(window: Window) {
    if WORKSPACE_LISTENER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        #[cfg(windows)]
        unsafe {
            let mut last_hwnd: HWND = std::ptr::null_mut();
            let mut last_title = String::new();
            let mut last_left_down = false;
            let mut last_right_down = false;

            loop {
                std::thread::sleep(Duration::from_millis(200));

                // -----------------------------------------------------------
                // Case 3: Virtual Desktop Switch (Ctrl + Win + Left/Right)
                // -----------------------------------------------------------
                let ctrl_down = (GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000) != 0;
                let win_down = (GetAsyncKeyState(VK_LWIN as i32) as u16 & 0x8000) != 0
                    || (GetAsyncKeyState(VK_RWIN as i32) as u16 & 0x8000) != 0;
                let left_down = (GetAsyncKeyState(VK_LEFT as i32) as u16 & 0x8000) != 0;
                let right_down = (GetAsyncKeyState(VK_RIGHT as i32) as u16 & 0x8000) != 0;

                if ctrl_down && win_down {
                    if left_down && !last_left_down {
                        let payload = WorkspaceActivityPayload {
                            kind: "desktop-switch".to_string(),
                            app_name: "Virtual Desktop".to_string(),
                            tab_title: "Desktop ←".to_string(),
                            direction: Some("left".to_string()),
                            accent_color: "#38bdf8".to_string(),
                        };
                        let _ = window.emit("workspace-activity", payload);
                    }
                    if right_down && !last_right_down {
                        let payload = WorkspaceActivityPayload {
                            kind: "desktop-switch".to_string(),
                            app_name: "Virtual Desktop".to_string(),
                            tab_title: "Desktop →".to_string(),
                            direction: Some("right".to_string()),
                            accent_color: "#38bdf8".to_string(),
                        };
                        let _ = window.emit("workspace-activity", payload);
                    }
                }
                last_left_down = left_down;
                last_right_down = right_down;

                // -----------------------------------------------------------
                // Cases 1 & 2: Foreground Window Query for Tab & App Switches
                // -----------------------------------------------------------
                let hwnd: HWND = GetForegroundWindow();
                if hwnd.is_null() {
                    continue;
                }

                // Ignore desktop and shell surfaces
                let desktop: HWND = GetDesktopWindow();
                let shell: HWND = GetShellWindow();
                if hwnd == desktop || hwnd == shell {
                    continue;
                }

                // Ignore LiquidIsland's own windows (overlay, dock, modals)
                let mut pid: u32 = 0;
                GetWindowThreadProcessId(hwnd, &mut pid);
                if pid == std::process::id() {
                    continue;
                }

                // Read window title
                let mut title_buf = [0u16; 512];
                let len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
                let current_title = if len > 0 {
                    String::from_utf16_lossy(&title_buf[..len as usize]).trim().to_string()
                } else {
                    String::new()
                };

                if current_title.is_empty() {
                    continue;
                }

                let is_first = last_hwnd.is_null();
                if !is_first {
                    if hwnd == last_hwnd && current_title != last_title {
                        // Case 1: Tab Switch inside the same application
                        let (app_name, tab_title, accent_color) = parse_window_activity(&current_title);
                        let payload = WorkspaceActivityPayload {
                            kind: "tab-switch".to_string(),
                            app_name,
                            tab_title,
                            direction: None,
                            accent_color,
                        };
                        let _ = window.emit("workspace-activity", payload);
                    } else if hwnd != last_hwnd && current_title != last_title {
                        // Case 2: App Switch to a different foreground application
                        let (app_name, tab_title, accent_color) = parse_window_activity(&current_title);
                        let payload = WorkspaceActivityPayload {
                            kind: "app-switch".to_string(),
                            app_name,
                            tab_title,
                            direction: None,
                            accent_color,
                        };
                        let _ = window.emit("workspace-activity", payload);
                    }
                }

                last_hwnd = hwnd;
                last_title = current_title;
            }
        }
    });
}

/// Pins or unpins the currently active foreground window to/from Always-on-Top.
#[tauri::command]
pub fn toggle_pin_active_window() -> String {
    #[cfg(windows)]
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.is_null() {
            return "No active foreground window found".to_string();
        }

        let desktop: HWND = GetDesktopWindow();
        let shell: HWND = GetShellWindow();
        if hwnd == desktop || hwnd == shell {
            return "Cannot pin desktop or shell surface".to_string();
        }

        let mut title_buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
        let title = if len > 0 {
            String::from_utf16_lossy(&title_buf[..len as usize])
        } else {
            "Active Window".to_string()
        };

        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        let is_topmost = (ex_style as u32 & WS_EX_TOPMOST) != 0;

        let target_hwnd = if is_topmost {
            HWND_NOTOPMOST
        } else {
            HWND_TOPMOST
        };

        let success: BOOL = SetWindowPos(
            hwnd,
            target_hwnd,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        );

        if success != 0 {
            if is_topmost {
                format!("Unpinned: {}", title)
            } else {
                format!("📌 Pinned: {}", title)
            }
        } else {
            format!("Failed to update window pin: {}", title)
        }
    }

    #[cfg(not(windows))]
    {
        "📌 Pinned: Simulated Window (Cross-Platform)".to_string()
    }
}

/// Checks whether the foreground application covers the entire target monitor (Fullscreen Gaming/Video).
#[tauri::command]
pub fn check_fullscreen_state() -> bool {
    #[cfg(windows)]
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.is_null() {
            return false;
        }

        let desktop: HWND = GetDesktopWindow();
        let shell: HWND = GetShellWindow();
        if hwnd == desktop || hwnd == shell {
            return false;
        }

        let mut win_rect: RECT = std::mem::zeroed();
        if GetWindowRect(hwnd, &mut win_rect) == 0 {
            return false;
        }

        let hmonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if hmonitor.is_null() {
            return false;
        }

        let mut monitor_info: MONITORINFO = std::mem::zeroed();
        monitor_info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;

        if GetMonitorInfoW(hmonitor, &mut monitor_info) == 0 {
            return false;
        }

        let mon_rect = monitor_info.rcMonitor;

        win_rect.left <= mon_rect.left
            && win_rect.top <= mon_rect.top
            && win_rect.right >= mon_rect.right
            && win_rect.bottom >= mon_rect.bottom
    }

    #[cfg(not(windows))]
    {
        false
    }
}