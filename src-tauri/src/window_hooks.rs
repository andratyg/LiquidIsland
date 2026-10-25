//! LiquidIsland OS - Native Win32 Multitasking & Window Hooks (Phase 8)
//! Provides foreground window pinning (Always-on-Top) and fullscreen gaming/video detection.

#[cfg(windows)]
use windows_sys::Win32::Foundation::{BOOL, HWND, RECT};
#[cfg(windows)]
use windows_sys::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowLongW, GetWindowRect,
    GetWindowTextW, SetWindowPos, GWL_EXSTYLE, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOACTIVATE,
    SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, WS_EX_TOPMOST,
};

/// Pins or unpins the currently active foreground window to/from Always-on-Top.
/// Returns a descriptive message such as "Pinned: Visual Studio Code" or "Unpinned: Chrome".
#[tauri::command]
pub fn toggle_pin_active_window() -> String {
    #[cfg(windows)]
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.is_null() {
            return "No active foreground window found".to_string();
        }

        // Avoid pinning desktop or shell window
        let desktop: HWND = GetDesktopWindow();
        let shell: HWND = GetShellWindow();
        if hwnd == desktop || hwnd == shell {
            return "Cannot pin desktop or shell surface".to_string();
        }

        // Read window title
        let mut title_buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
        let title = if len > 0 {
            String::from_utf16_lossy(&title_buf[..len as usize])
        } else {
            "Active Window".to_string()
        };

        // Check if currently topmost
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

/// Checks whether the foreground application covers the entire target monitor (e.g. Fullscreen Video / Gaming).
/// Used by the frontend to automatically slip into 'bezel-line' stealth mode.
#[tauri::command]
pub fn check_fullscreen_state() -> bool {
    #[cfg(windows)]
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.is_null() {
            return false;
        }

        // Exclude desktop and shell
        let desktop: HWND = GetDesktopWindow();
        let shell: HWND = GetShellWindow();
        if hwnd == desktop || hwnd == shell {
            return false;
        }

        // Get window dimensions
        let mut win_rect: RECT = std::mem::zeroed();
        if GetWindowRect(hwnd, &mut win_rect) == 0 {
            return false;
        }

        // Get the monitor that contains the window
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

        // Check if window bounds cover or exceed the monitor area
        let is_fullscreen = win_rect.left <= mon_rect.left
            && win_rect.top <= mon_rect.top
            && win_rect.right >= mon_rect.right
            && win_rect.bottom >= mon_rect.bottom;

        is_fullscreen
    }

    #[cfg(not(windows))]
    {
        false
    }
}
