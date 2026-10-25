//! LiquidIsland OS - Native Taskbar Engine & Running Apps Switcher (Phase 10 & Stage 3)
//! Provides native Windows taskbar override (auto-hide safe), real running apps enumerator,
//! app focus/toggle switcher, hardware start menu/terminal launch actions, and smart dock auto-hide.

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
    WebviewWindowBuilder, Window,
};

#[cfg(windows)]
use windows_sys::Win32::Foundation::{BOOL, HWND, LPARAM, POINT, RECT};
#[cfg(windows)]
use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowW, GetCursorPos, GetDesktopWindow, GetForegroundWindow, GetShellWindow,
    GetWindowLongW, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId, IsIconic,
    IsWindowVisible, SetForegroundWindow, ShowWindow, GWL_EXSTYLE, SW_HIDE, SW_MINIMIZE,
    SW_RESTORE, SW_SHOW, WS_EX_TOOLWINDOW,
};

pub static TASKBAR_MODIFIED: AtomicBool = AtomicBool::new(false);
pub static NATIVE_TASKBAR_HIDDEN: AtomicBool = AtomicBool::new(false);
pub static DOCK_LOOP_STARTED: AtomicBool = AtomicBool::new(false);
pub static DOCK_HOVERED: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RunningAppInfo {
    pub hwnd: isize,
    pub title: String,
    pub process_name: String,
    pub is_focused: bool,
    pub icon_hint: String, // "chrome", "edge", "code", "terminal", "explorer", "spotify", "discord", "slack", "generic"
}

#[cfg(windows)]
pub mod win32 {
    use super::*;
    use windows_sys::Win32::Foundation::{BOOL, HWND};
    use windows_sys::Win32::Graphics::Gdi::{
        RedrawWindow, SetWindowRgn, RDW_ALLCHILDREN, RDW_ERASE, RDW_FRAME, RDW_INVALIDATE,
        RDW_UPDATENOW,
    };
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, IsZoomed, SetWindowPos, SWP_FRAMECHANGED, SWP_NOMOVE, SWP_NOSIZE,
        SWP_NOZORDER, SWP_SHOWWINDOW,
    };

    #[repr(C)]
    struct AccentPolicy {
        accent_state: u32,
        accent_flags: u32,
        gradient_color: u32,
        animation_id: u32,
    }

    #[repr(C)]
    struct WindowCompositionAttributeData {
        attribute: u32,
        data: *const std::ffi::c_void,
        size_of_data: usize,
    }

    type SetWindowCompositionAttributeFn = unsafe extern "system" fn(
        hwnd: HWND,
        data: *mut WindowCompositionAttributeData,
    ) -> BOOL;

    const WCA_ACCENT_POLICY: u32 = 19;
    const ACCENT_DISABLED: u32 = 0;
    const ACCENT_ENABLE_ACRYLICBLURBEHIND: u32 = 4;

    pub unsafe fn get_taskbar_hwnd() -> HWND {
        FindWindowW(windows_sys::core::w!("Shell_TrayWnd"), std::ptr::null())
    }

    pub unsafe fn get_secondary_taskbar_hwnd() -> HWND {
        FindWindowW(windows_sys::core::w!("Shell_SecondaryTrayWnd"), std::ptr::null())
    }

    /// Resets the window region of the taskbar to NULL and forces Windows to redraw it
    pub unsafe fn ensure_taskbar_visible_and_unclipped(hwnd: HWND) {
        if hwnd.is_null() {
            return;
        }

        SetWindowRgn(hwnd, std::ptr::null_mut(), 1);
        ShowWindow(hwnd, SW_SHOW);

        SetWindowPos(
            hwnd,
            std::ptr::null_mut(),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
        );

        RedrawWindow(
            hwnd,
            std::ptr::null(),
            std::ptr::null_mut(),
            RDW_INVALIDATE | RDW_ERASE | RDW_FRAME | RDW_ALLCHILDREN | RDW_UPDATENOW,
        );
    }

    unsafe fn apply_acrylic_policy(hwnd: HWND, state: u32, color_argb: u32) {
        let user32 = GetModuleHandleA(b"user32.dll\0".as_ptr());
        if user32.is_null() {
            return;
        }

        let proc = GetProcAddress(user32, b"SetWindowCompositionAttribute\0".as_ptr());
        if let Some(set_wca) = proc {
            let func: SetWindowCompositionAttributeFn = std::mem::transmute(set_wca);
            let policy = AccentPolicy {
                accent_state: state,
                accent_flags: 2,
                gradient_color: color_argb,
                animation_id: 0,
            };

            let mut data = WindowCompositionAttributeData {
                attribute: WCA_ACCENT_POLICY,
                data: &policy as *const _ as *const std::ffi::c_void,
                size_of_data: std::mem::size_of::<AccentPolicy>(),
            };

            func(hwnd, &mut data);
        }
    }

    pub unsafe fn apply_option_a(hwnd: HWND, theme: &str) -> bool {
        ensure_taskbar_visible_and_unclipped(hwnd);

        let color = if theme.eq_ignore_ascii_case("light") {
            0xB0F8FAFC
        } else {
            0xC0121216
        };

        apply_acrylic_policy(hwnd, ACCENT_ENABLE_ACRYLICBLURBEHIND, color);
        TASKBAR_MODIFIED.store(true, Ordering::Relaxed);
        true
    }

    pub unsafe fn apply_option_b(hwnd: HWND, theme: &str) -> bool {
        ensure_taskbar_visible_and_unclipped(hwnd);

        let color = if theme.eq_ignore_ascii_case("light") {
            0x25F8FAFC
        } else {
            0x25121216
        };

        apply_acrylic_policy(hwnd, ACCENT_ENABLE_ACRYLICBLURBEHIND, color);
        TASKBAR_MODIFIED.store(true, Ordering::Relaxed);
        true
    }

    pub unsafe fn apply_option_c(hwnd: HWND, theme: &str) -> bool {
        ensure_taskbar_visible_and_unclipped(hwnd);

        let fg_hwnd = GetForegroundWindow();
        let is_maximized = if !fg_hwnd.is_null() {
            IsZoomed(fg_hwnd) != 0
        } else {
            false
        };

        if is_maximized {
            apply_option_a(hwnd, theme)
        } else {
            apply_option_b(hwnd, theme)
        }
    }

    pub unsafe fn restore_default(hwnd: HWND) -> bool {
        ensure_taskbar_visible_and_unclipped(hwnd);
        apply_acrylic_policy(hwnd, ACCENT_DISABLED, 0);

        let sec_hwnd = get_secondary_taskbar_hwnd();
        if !sec_hwnd.is_null() {
            ensure_taskbar_visible_and_unclipped(sec_hwnd);
            apply_acrylic_policy(sec_hwnd, ACCENT_DISABLED, 0);
        }

        TASKBAR_MODIFIED.store(false, Ordering::Relaxed);
        true
    }
}

/// Helper to categorize application icon hint from title and process name
fn determine_icon_hint(title: &str, proc_name: &str) -> String {
    let t = title.to_lowercase();
    let p = proc_name.to_lowercase();

    if p.contains("chrome") || t.contains("google chrome") {
        "chrome".to_string()
    } else if p.contains("msedge") || t.contains("microsoft edge") {
        "edge".to_string()
    } else if p.contains("brave") || t.contains("brave") {
        "brave".to_string()
    } else if p.contains("firefox") || t.contains("firefox") {
        "firefox".to_string()
    } else if p.contains("code") || t.contains("visual studio code") {
        "code".to_string()
    } else if p.contains("cursor") || t.contains("cursor") {
        "cursor".to_string()
    } else if t.contains("antigravity") {
        "antigravity".to_string()
    } else if p.contains("windowsterminal")
        || p.contains("wt")
        || p.contains("powershell")
        || p.contains("cmd")
        || t.contains("terminal")
    {
        "terminal".to_string()
    } else if p.contains("explorer") || t.contains("file explorer") {
        "explorer".to_string()
    } else if p.contains("spotify") || t.contains("spotify") {
        "spotify".to_string()
    } else if p.contains("discord") || t.contains("discord") {
        "discord".to_string()
    } else if p.contains("slack") || t.contains("slack") {
        "slack".to_string()
    } else if t.contains("youtube") {
        "youtube".to_string()
    } else {
        "generic".to_string()
    }
}

#[cfg(windows)]
unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let list = &mut *(lparam as *mut Vec<RunningAppInfo>);

    if IsWindowVisible(hwnd) == 0 {
        return 1;
    }

    // Exclude desktop, shell, and taskbar
    let desktop = GetDesktopWindow();
    let shell = GetShellWindow();
    let taskbar_primary = win32::get_taskbar_hwnd();
    let taskbar_sec = win32::get_secondary_taskbar_hwnd();

    if hwnd == desktop || hwnd == shell || hwnd == taskbar_primary || hwnd == taskbar_sec {
        return 1;
    }

    // Exclude LiquidIsland overlay & dock windows
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, &mut pid);
    if pid == std::process::id() {
        return 1;
    }

    // Exclude Tool Windows
    let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
    if (ex_style & WS_EX_TOOLWINDOW) != 0 {
        return 1;
    }

    // Exclude zero-size windows
    let mut rect: RECT = std::mem::zeroed();
    if GetWindowRect(hwnd, &mut rect) == 0 {
        return 1;
    }
    if rect.right <= rect.left || rect.bottom <= rect.top {
        return 1;
    }

    // Exclude cloaked windows (Windows 10/11 virtual desktops and minimized UWP)
    let mut cloaked: u32 = 0;
    let hr = DwmGetWindowAttribute(
        hwnd,
        DWMWA_CLOAKED as u32,
        &mut cloaked as *mut _ as *mut _,
        std::mem::size_of::<u32>() as u32,
    );
    if hr == 0 && cloaked != 0 {
        return 1;
    }

    // Read window title
    let mut buf = [0u16; 512];
    let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
    if len <= 0 {
        return 1;
    }

    let title = String::from_utf16_lossy(&buf[..len as usize]).trim().to_string();
    if title.is_empty()
        || title == "Program Manager"
        || title == "Windows Input Experience"
        || title == "Setup"
    {
        return 1;
    }

    let fg = GetForegroundWindow();
    let is_focused = hwnd == fg;
    let icon_hint = determine_icon_hint(&title, "");

    list.push(RunningAppInfo {
        hwnd: hwnd as isize,
        title,
        process_name: String::new(),
        is_focused,
        icon_hint,
    });

    1
}

/// Enumerates all real visible, running user application windows via Win32 EnumWindows
#[tauri::command]
pub fn get_running_apps() -> Vec<RunningAppInfo> {
    #[cfg(windows)]
    unsafe {
        let mut apps: Vec<RunningAppInfo> = Vec::new();
        EnumWindows(
            Some(enum_windows_callback),
            &mut apps as *mut Vec<RunningAppInfo> as LPARAM,
        );
        apps
    }

    #[cfg(not(windows))]
    {
        vec![
            RunningAppInfo {
                hwnd: 101,
                title: "Google Chrome — GitHub".to_string(),
                process_name: "chrome.exe".to_string(),
                is_focused: true,
                icon_hint: "chrome".to_string(),
            },
            RunningAppInfo {
                hwnd: 102,
                title: "Visual Studio Code".to_string(),
                process_name: "code.exe".to_string(),
                is_focused: false,
                icon_hint: "code".to_string(),
            },
            RunningAppInfo {
                hwnd: 103,
                title: "Windows Terminal".to_string(),
                process_name: "wt.exe".to_string(),
                is_focused: false,
                icon_hint: "terminal".to_string(),
            },
        ]
    }
}

/// Focuses or toggles (minimizes if already focused) a target application window
#[tauri::command]
pub fn focus_or_toggle_app(hwnd: isize) -> bool {
    #[cfg(windows)]
    unsafe {
        let target = hwnd as HWND;
        if target.is_null() {
            return false;
        }

        let fg = GetForegroundWindow();
        if target == fg {
            ShowWindow(target, SW_MINIMIZE);
        } else {
            if IsIconic(target) != 0 {
                ShowWindow(target, SW_RESTORE);
            }
            SetForegroundWindow(target);
        }
        true
    }

    #[cfg(not(windows))]
    {
        let _ = hwnd;
        true
    }
}

/// Launches standard Windows tools or simulates the Start Menu keypress
#[tauri::command]
pub fn launch_system_action(action: String) -> bool {
    #[cfg(windows)]
    {
        use std::process::Command;
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            keybd_event, KEYEVENTF_KEYUP, VK_LWIN,
        };

        match action.as_str() {
            "start_menu" => unsafe {
                keybd_event(VK_LWIN as u8, 0, 0, 0);
                keybd_event(VK_LWIN as u8, 0, KEYEVENTF_KEYUP, 0);
                true
            },
            "explorer" => {
                let _ = Command::new("explorer.exe").spawn();
                true
            }
            "terminal" => {
                if Command::new("wt.exe").spawn().is_err() {
                    let _ = Command::new("powershell.exe").spawn();
                }
                true
            }
            "browser" => {
                let _ = Command::new("cmd")
                    .args(&["/c", "start", "https://google.com"])
                    .spawn();
                true
            }
            _ => false,
        }
    }

    #[cfg(not(windows))]
    {
        let _ = action;
        true
    }
}

/// Hides or restores the native Windows Taskbar (Shell_TrayWnd & Shell_SecondaryTrayWnd)
#[tauri::command]
pub fn set_native_taskbar_hidden(hidden: bool) -> bool {
    #[cfg(windows)]
    unsafe {
        let primary = win32::get_taskbar_hwnd();
        let secondary = win32::get_secondary_taskbar_hwnd();
        let cmd = if hidden { SW_HIDE } else { SW_SHOW };

        if !primary.is_null() {
            ShowWindow(primary, cmd);
        }
        if !secondary.is_null() {
            ShowWindow(secondary, cmd);
        }

        if !hidden {
            if !primary.is_null() {
                win32::ensure_taskbar_visible_and_unclipped(primary);
            }
            if !secondary.is_null() {
                win32::ensure_taskbar_visible_and_unclipped(secondary);
            }
        }

        NATIVE_TASKBAR_HIDDEN.store(hidden, Ordering::Relaxed);
        true
    }

    #[cfg(not(windows))]
    {
        let _ = hidden;
        true
    }
}

/// Spawns or updates the dedicated bottom Taskbar Dock window ("taskbar-dock") flush at bottom of screen
pub fn spawn_or_update_taskbar_window(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let window = if let Some(w) = app.get_webview_window("taskbar-dock") {
        w
    } else {
        let builder = WebviewWindowBuilder::new(
            app,
            "taskbar-dock",
            WebviewUrl::App("index.html?window=taskbar".into()),
        )
        .title("LiquidIsland Taskbar")
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .resizable(false);

        builder.build()?
    };

    if let Ok(Some(monitor)) = app.primary_monitor() {
        let pos = monitor.position();
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let height_px = (68.0 * scale).round() as u32;

        let win_x = pos.x;
        let win_y = pos.y + size.height as i32 - height_px as i32;

        let _ = window.set_size(Size::Physical(PhysicalSize {
            width: size.width,
            height: height_px,
        }));
        let _ = window.set_position(Position::Physical(PhysicalPosition {
            x: win_x,
            y: win_y,
        }));
    }

    let _ = window.set_ignore_cursor_events(false);
    start_dock_hit_test_loop(window.as_ref().window().clone());

    Ok(())
}

/// Spawns a background thread checking cursor position for the bottom dock window
pub fn start_dock_hit_test_loop(window: Window) {
    if DOCK_LOOP_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        #[cfg(windows)]
        let mut pt: POINT = unsafe { std::mem::zeroed() };
        let mut prev_inside = false;

        loop {
            std::thread::sleep(Duration::from_millis(35));

            let hover_forced = DOCK_HOVERED.load(Ordering::Relaxed);

            #[cfg(windows)]
            {
                let success = unsafe { GetCursorPos(&mut pt) };
                if success != 0 {
                    if let Ok(pos) = window.outer_position() {
                        if let Ok(size) = window.outer_size() {
                            let monitor_bottom = pos.y + size.height as i32;

                            // Near bottom edge of the monitor (within 12px)
                            let near_edge = pt.y >= (monitor_bottom - 12) && pt.y <= (monitor_bottom + 6);

                            // Inside the centered dock bounds (~960px centered)
                            let center_x = pos.x + (size.width as i32 / 2);
                            let half_dock_w = 480;
                            let in_capsule_x =
                                (pt.x >= center_x - half_dock_w) && (pt.x <= center_x + half_dock_w);
                            let in_dock_y =
                                pt.y >= (monitor_bottom - 72) && pt.y <= (monitor_bottom + 6);

                            let inside = hover_forced || near_edge || (in_capsule_x && in_dock_y);

                            if inside != prev_inside {
                                prev_inside = inside;
                                let _ = window.set_ignore_cursor_events(!inside);
                                let _ = window.emit("dock-hover-state", inside);
                            }
                        }
                    }
                }
            }
        }
    });
}

/// Tauri command to dynamically set click-through for taskbar-dock
#[tauri::command]
pub fn set_dock_click_through(app: AppHandle, ignore: bool) {
    DOCK_HOVERED.store(!ignore, Ordering::Relaxed);
    if let Some(dock_win) = app.get_webview_window("taskbar-dock") {
        let _ = dock_win.set_ignore_cursor_events(ignore);
    }
}

/// Tauri command to apply taskbar mode ("A", "B", "C") and theme ("dark", "light")
#[tauri::command]
pub fn apply_taskbar_mode(mode: String, theme: String) -> bool {
    #[cfg(windows)]
    unsafe {
        let hwnd = win32::get_taskbar_hwnd();
        if hwnd.is_null() {
            eprintln!("[LiquidIsland Taskbar] Windows Taskbar hwnd (Shell_TrayWnd) not found.");
            return false;
        }

        win32::ensure_taskbar_visible_and_unclipped(hwnd);

        match mode.to_uppercase().as_str() {
            "A" => win32::apply_option_a(hwnd, &theme),
            "B" => win32::apply_option_b(hwnd, &theme),
            "C" => win32::apply_option_c(hwnd, &theme),
            _ => win32::apply_option_b(hwnd, &theme),
        }
    }

    #[cfg(not(windows))]
    {
        let _ = (mode, theme);
        true
    }
}

/// Tauri command to cleanly restore the default Windows taskbar
#[tauri::command]
pub fn restore_default_taskbar() -> bool {
    // Unhide native taskbar first
    set_native_taskbar_hidden(false);

    #[cfg(windows)]
    unsafe {
        let hwnd = win32::get_taskbar_hwnd();
        if !hwnd.is_null() {
            return win32::restore_default(hwnd);
        }
        false
    }

    #[cfg(not(windows))]
    {
        true
    }
}

/// Tauri command to restart Windows Explorer (useful for reviving taskbar if corrupted or stuck)
#[tauri::command]
pub fn restart_windows_explorer() -> bool {
    // Ensure taskbar is set to unhidden
    set_native_taskbar_hidden(false);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "explorer.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        std::thread::sleep(std::time::Duration::from_millis(500));

        let _ = Command::new("explorer.exe").spawn();
        true
    }

    #[cfg(not(windows))]
    {
        true
    }
}