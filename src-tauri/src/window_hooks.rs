//! LiquidIsland OS - Native Win32 Multitasking & Window Hooks (Phase 8 & Stage 2)
//! Provides foreground window pinning, fullscreen gaming detection, and
//! real-time tab-switch, app-switch, and virtual desktop switch activity detection.

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{Emitter, Manager, Window};

#[cfg(windows)]
use windows_sys::Win32::Foundation::{BOOL, HWND, RECT};
#[cfg(windows)]
use windows_sys::Win32::Graphics::Gdi::{
    CreateCompatibleDC, DeleteDC, GetDC, GetDIBits, GetMonitorInfoW, GetObjectW,
    MonitorFromWindow, ReleaseDC, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
    DIB_RGB_COLORS, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
#[cfg(windows)]
use windows_sys::Win32::System::DataExchange::{
    CloseClipboard, GetClipboardData, GetClipboardSequenceNumber, IsClipboardFormatAvailable,
    OpenClipboard,
};
#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, VK_CONTROL, VK_LEFT, VK_LWIN, VK_MENU, VK_RIGHT, VK_RWIN, VK_SHIFT,
};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    FindWindowExW, FindWindowW, GetDesktopWindow, GetForegroundWindow, GetShellWindow,
    GetWindowLongW, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId, SetWindowPos,
    ShowWindow, GWL_EXSTYLE, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE,
    SWP_NOSIZE, SWP_SHOWWINDOW, SW_HIDE, WS_EX_TOPMOST,
};

#[cfg(windows)]
unsafe fn suppress_native_windows_osd() {
    // 1. Windows 10/11 MediaFlyout / OSD host ("NativeHWNDHost" with "DirectUIHWND")
    let class_native: Vec<u16> = "NativeHWNDHost\0".encode_utf16().collect();
    let mut hwnd = FindWindowW(class_native.as_ptr(), std::ptr::null());
    let mut iterations = 0;
    while !hwnd.is_null() && iterations < 8 {
        let class_direct: Vec<u16> = "DirectUIHWND\0".encode_utf16().collect();
        let child = FindWindowExW(hwnd, std::ptr::null_mut(), class_direct.as_ptr(), std::ptr::null());
        if !child.is_null() {
            ShowWindow(hwnd, SW_HIDE);
            SetWindowPos(hwnd, std::ptr::null_mut(), -9999, -9999, 0, 0, SWP_NOACTIVATE | SWP_NOSIZE);
        }
        hwnd = FindWindowExW(std::ptr::null_mut(), hwnd, class_native.as_ptr(), std::ptr::null());
        iterations += 1;
    }

    // 2. Modern Windows Hardware Notification Window ("HardwareNotificationWindow")
    let class_hw: Vec<u16> = "HardwareNotificationWindow\0".encode_utf16().collect();
    let hw_hwnd = FindWindowW(class_hw.as_ptr(), std::ptr::null());
    if !hw_hwnd.is_null() {
        ShowWindow(hw_hwnd, SW_HIDE);
        SetWindowPos(hw_hwnd, std::ptr::null_mut(), -9999, -9999, 0, 0, SWP_NOACTIVATE | SWP_NOSIZE);
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WorkspaceActivityPayload {
    pub kind: String,              // "tab-switch" | "app-switch" | "desktop-switch"
    pub app_name: String,          // e.g. "Google Chrome", "VS Code"
    pub tab_title: String,         // Cleaned tab or document title
    pub direction: Option<String>, // "left" | "right" for desktop-switch
    pub accent_color: String,      // Color token
    pub recent_apps: Option<Vec<crate::taskbar::RunningAppInfo>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HudChangePayload {
    pub kind: String,              // "volume" | "brightness" | "mute"
    pub delta: i32,                // step delta e.g. +4, -4, +5, -5
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScreenshotCapturedPayload {
    pub data_url: String,
    pub filename: String,
    pub width: u32,
    pub height: u32,
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

    let app_handle = window.app_handle().clone();

    std::thread::spawn(move || {
        #[cfg(windows)]
        unsafe {
            let mut last_hwnd: HWND = std::ptr::null_mut();
            let mut last_title = String::new();
            let mut last_left_down = false;
            let mut last_right_down = false;
            let mut last_alt_s_down = false;
            let mut last_capture_down = false;
            let mut last_alt_tab_down = false;
            let mut last_ctrl_tab_down = false;
            let mut last_vol_up = false;
            let mut last_vol_down = false;
            let mut last_mute = false;
            let mut last_bright_up = false;
            let mut last_bright_down = false;
            let mut last_clipboard_seq: u32 = GetClipboardSequenceNumber();
            let mut tick_count: u32 = 0;

            loop {
                std::thread::sleep(Duration::from_millis(25));
                tick_count = tick_count.wrapping_add(1);

                // Helper to detect both current state (0x8000) and transition state (0x0001) for ultra-fast taps (<30ms)
                let is_key_down = |vk: i32| -> bool {
                    let s = GetAsyncKeyState(vk) as u16;
                    (s & 0x8000) != 0 || (s & 0x0001) != 0
                };

                // -----------------------------------------------------------
                // Global Hotkey: Alt + S (Toggle Spotlight Search)
                // -----------------------------------------------------------
                let alt_down = is_key_down(VK_MENU as i32);
                let s_down = is_key_down(0x53); // 0x53 = 'S'

                if alt_down && s_down {
                    if !last_alt_s_down {
                        last_alt_s_down = true;
                        let _ = app_handle.emit("open-spotlight", ());
                    }
                } else {
                    last_alt_s_down = false;
                }

                // -----------------------------------------------------------
                // Global Hotkey: Snapshot / PrtScn (0x2C), Alt + C, Win + Shift + S
                // -----------------------------------------------------------
                let prtscn_down = is_key_down(0x2C); // VK_SNAPSHOT
                let c_down = is_key_down(0x43); // 'C'
                let shift_down = is_key_down(VK_SHIFT as i32);
                let win_down_any = is_key_down(VK_LWIN as i32) || is_key_down(VK_RWIN as i32);
                let capture_combo = prtscn_down || (alt_down && c_down) || (win_down_any && shift_down && s_down);

                if capture_combo {
                    if !last_capture_down {
                        last_capture_down = true;
                        let _ = app_handle.emit("open-capture-bar", ());
                    }
                } else {
                    last_capture_down = false;
                }

                // -----------------------------------------------------------
                // 40MB Edition - Stage 3: VisionOS 3D Alt+Tab & Ctrl+Tab Interceptor
                // -----------------------------------------------------------
                let tab_down = is_key_down(0x09); // VK_TAB

                if alt_down && tab_down {
                    if !last_alt_tab_down {
                        last_alt_tab_down = true;
                        let running_apps = crate::taskbar::get_running_apps();
                        let top5: Vec<crate::taskbar::RunningAppInfo> = running_apps.into_iter().take(5).collect();
                        let (app_name, tab_title, accent_color) = if let Some(first) = top5.first() {
                            parse_window_activity(&first.title)
                        } else {
                            ("Application".to_string(), "Window Switcher".to_string(), "#38bdf8".to_string())
                        };

                        let payload = WorkspaceActivityPayload {
                            kind: "app-switch".to_string(),
                            app_name,
                            tab_title,
                            direction: None,
                            accent_color,
                            recent_apps: Some(top5),
                        };
                        let _ = app_handle.emit("workspace-activity", payload);
                    }
                } else {
                    last_alt_tab_down = false;
                }

                let ctrl_down = is_key_down(VK_CONTROL as i32);
                let win_down = is_key_down(VK_LWIN as i32) || is_key_down(VK_RWIN as i32);

                if ctrl_down && tab_down && !alt_down && !win_down {
                    if !last_ctrl_tab_down {
                        last_ctrl_tab_down = true;
                        let running_apps = crate::taskbar::get_running_apps();
                        let top5: Vec<crate::taskbar::RunningAppInfo> = running_apps.into_iter().take(5).collect();
                        let (app_name, tab_title, accent_color) = if let Some(first) = top5.first() {
                            parse_window_activity(&first.title)
                        } else {
                            ("Active Tab".to_string(), "Tab Switcher".to_string(), "#38bdf8".to_string())
                        };

                        let payload = WorkspaceActivityPayload {
                            kind: "tab-switch".to_string(),
                            app_name,
                            tab_title,
                            direction: None,
                            accent_color,
                            recent_apps: Some(top5),
                        };
                        let _ = app_handle.emit("workspace-activity", payload);
                    }
                } else {
                    last_ctrl_tab_down = false;
                }

                // -----------------------------------------------------------
                // Dedicated Volume & Screen Brightness Hardware HUD Keys
                // -----------------------------------------------------------
                let vol_up_down = is_key_down(0xAF); // VK_VOLUME_UP
                let vol_down_down = is_key_down(0xAE); // VK_VOLUME_DOWN
                let mute_down = is_key_down(0xAD); // VK_VOLUME_MUTE

                let arrow_up_down = is_key_down(0x26); // VK_UP
                let arrow_down_down = is_key_down(0x28); // VK_DOWN
                let oem_bright_up = is_key_down(0xE9); // VK_BRIGHTNESS_UP
                let oem_bright_down = is_key_down(0xEA); // VK_BRIGHTNESS_DOWN

                let bright_up_down = oem_bright_up || (alt_down && arrow_up_down);
                let bright_down_down = oem_bright_down || (alt_down && arrow_down_down);

                if vol_up_down {
                    if !last_vol_up {
                        last_vol_up = true;
                        suppress_native_windows_osd();
                        let _ = app_handle.emit("hud-change", HudChangePayload {
                            kind: "volume".to_string(),
                            delta: 4,
                        });
                    }
                } else {
                    last_vol_up = false;
                }

                if vol_down_down {
                    if !last_vol_down {
                        last_vol_down = true;
                        suppress_native_windows_osd();
                        let _ = app_handle.emit("hud-change", HudChangePayload {
                            kind: "volume".to_string(),
                            delta: -4,
                        });
                    }
                } else {
                    last_vol_down = false;
                }

                if mute_down {
                    if !last_mute {
                        last_mute = true;
                        suppress_native_windows_osd();
                        let _ = app_handle.emit("hud-change", HudChangePayload {
                            kind: "mute".to_string(),
                            delta: 0,
                        });
                    }
                } else {
                    last_mute = false;
                }

                if bright_up_down {
                    if !last_bright_up {
                        last_bright_up = true;
                        suppress_native_windows_osd();
                        let _ = app_handle.emit("hud-change", HudChangePayload {
                            kind: "brightness".to_string(),
                            delta: 5,
                        });
                    }
                } else {
                    last_bright_up = false;
                }

                if bright_down_down {
                    if !last_bright_down {
                        last_bright_down = true;
                        suppress_native_windows_osd();
                        let _ = app_handle.emit("hud-change", HudChangePayload {
                            kind: "brightness".to_string(),
                            delta: -5,
                        });
                    }
                } else {
                    last_bright_down = false;
                }

                // -----------------------------------------------------------
                // Case 3: Virtual Desktop Switch (Ctrl + Win + Left/Right)
                // -----------------------------------------------------------
                let ctrl_down = is_key_down(VK_CONTROL as i32);
                let win_down = is_key_down(VK_LWIN as i32) || is_key_down(VK_RWIN as i32);
                let left_down = is_key_down(VK_LEFT as i32);
                let right_down = is_key_down(VK_RIGHT as i32);

                if ctrl_down && win_down {
                    if left_down && !last_left_down {
                        let running_apps = crate::taskbar::get_running_apps();
                        let top5: Vec<crate::taskbar::RunningAppInfo> = running_apps.into_iter().take(5).collect();
                        let payload = WorkspaceActivityPayload {
                            kind: "desktop-switch".to_string(),
                            app_name: "Virtual Desktop".to_string(),
                            tab_title: "Desktop ←".to_string(),
                            direction: Some("left".to_string()),
                            accent_color: "#38bdf8".to_string(),
                            recent_apps: Some(top5),
                        };
                        let _ = app_handle.emit("workspace-activity", payload);
                    }
                    if right_down && !last_right_down {
                        let running_apps = crate::taskbar::get_running_apps();
                        let top5: Vec<crate::taskbar::RunningAppInfo> = running_apps.into_iter().take(5).collect();
                        let payload = WorkspaceActivityPayload {
                            kind: "desktop-switch".to_string(),
                            app_name: "Virtual Desktop".to_string(),
                            tab_title: "Desktop →".to_string(),
                            direction: Some("right".to_string()),
                            accent_color: "#38bdf8".to_string(),
                            recent_apps: Some(top5),
                        };
                        let _ = app_handle.emit("workspace-activity", payload);
                    }
                }
                last_left_down = left_down;
                last_right_down = right_down;

                // -----------------------------------------------------------
                // Windows Clipboard Bitmap Interceptor (40MB Edition - Stage 1)
                // -----------------------------------------------------------
                if tick_count % 4 == 0 {
                    let current_seq = GetClipboardSequenceNumber();
                    if current_seq != last_clipboard_seq {
                        last_clipboard_seq = current_seq;
                        if IsClipboardFormatAvailable(crate::screen_capture::CF_BITMAP) != 0 {
                            if OpenClipboard(std::ptr::null_mut()) != 0 {
                                let hbitmap = GetClipboardData(crate::screen_capture::CF_BITMAP);
                                if !hbitmap.is_null() {
                                    let mut bmp: BITMAP = std::mem::zeroed();
                                    if GetObjectW(
                                        hbitmap as _,
                                        std::mem::size_of::<BITMAP>() as i32,
                                        &mut bmp as *mut _ as *mut _,
                                    ) != 0 && bmp.bmWidth > 0 && bmp.bmHeight != 0 {
                                        let width = bmp.bmWidth as u32;
                                        let height = (bmp.bmHeight.abs()) as u32;

                                        let screen_dc = GetDC(std::ptr::null_mut());
                                        let mem_dc = CreateCompatibleDC(screen_dc);

                                        let mut bmi: BITMAPINFO = std::mem::zeroed();
                                        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
                                        bmi.bmiHeader.biWidth = width as i32;
                                        bmi.bmiHeader.biHeight = -(height as i32);
                                        bmi.bmiHeader.biPlanes = 1;
                                        bmi.bmiHeader.biBitCount = 32;
                                        bmi.bmiHeader.biCompression = BI_RGB as u32;

                                        let total_pixels = (width * height) as usize;
                                        let mut bgra_pixels = vec![0u8; total_pixels * 4];

                                        let lines = GetDIBits(
                                            mem_dc,
                                            hbitmap as _,
                                            0,
                                            height,
                                            bgra_pixels.as_mut_ptr() as *mut _,
                                            &mut bmi,
                                            DIB_RGB_COLORS,
                                        );

                                        DeleteDC(mem_dc);
                                        ReleaseDC(std::ptr::null_mut(), screen_dc);

                                        if lines > 0 {
                                            let mut rgba_pixels = vec![0u8; total_pixels * 4];
                                            for i in 0..total_pixels {
                                                rgba_pixels[i * 4] = bgra_pixels[i * 4 + 2];
                                                rgba_pixels[i * 4 + 1] = bgra_pixels[i * 4 + 1];
                                                rgba_pixels[i * 4 + 2] = bgra_pixels[i * 4];
                                                rgba_pixels[i * 4 + 3] = 255;
                                            }

                                            if let Ok(data_url) = crate::screen_capture::encode_rgba_to_png_data_url(
                                                &rgba_pixels,
                                                width,
                                                height,
                                            ) {
                                                let filename = crate::screen_capture::generate_screenshot_filename();
                                                let _ = app_handle.emit(
                                                    "screenshot-captured",
                                                    ScreenshotCapturedPayload {
                                                        data_url,
                                                        filename,
                                                        width,
                                                        height,
                                                    },
                                                );
                                            }
                                        }
                                    }
                                }
                                CloseClipboard();
                            }
                        }
                    }
                }

                // Only check foreground window every 8 ticks (~200ms at 25ms loop) to conserve CPU
                if tick_count % 8 != 0 {
                    continue;
                }

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
                        let running_apps = crate::taskbar::get_running_apps();
                        let top5: Vec<crate::taskbar::RunningAppInfo> = running_apps.into_iter().take(5).collect();
                        let payload = WorkspaceActivityPayload {
                            kind: "tab-switch".to_string(),
                            app_name,
                            tab_title,
                            direction: None,
                            accent_color,
                            recent_apps: Some(top5),
                        };
                        let _ = app_handle.emit("workspace-activity", payload);
                    } else if hwnd != last_hwnd && current_title != last_title {
                        // Case 2: App Switch to a different foreground application
                        let (app_name, tab_title, accent_color) = parse_window_activity(&current_title);
                        let running_apps = crate::taskbar::get_running_apps();
                        let top5: Vec<crate::taskbar::RunningAppInfo> = running_apps.into_iter().take(5).collect();
                        let payload = WorkspaceActivityPayload {
                            kind: "app-switch".to_string(),
                            app_name,
                            tab_title,
                            direction: None,
                            accent_color,
                            recent_apps: Some(top5),
                        };
                        let _ = app_handle.emit("workspace-activity", payload);
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