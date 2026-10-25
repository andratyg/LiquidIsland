//! LiquidIsland OS - Native Taskbar Engine & Running Apps Switcher (Phase 10 & Stage 3)
//! Provides native Windows taskbar override (auto-hide safe), real running apps enumerator,
//! app focus/toggle switcher, hardware start menu/terminal launch actions, and smart dock auto-hide.

use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
    WebviewWindowBuilder, Window,
};

#[cfg(windows)]
use windows_sys::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM, POINT, RECT};
#[cfg(windows)]
use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
#[cfg(windows)]
use windows_sys::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, EnumWindows, FindWindowW, GetCursorPos, GetDesktopWindow,
    GetForegroundWindow, GetShellWindow, GetSystemMetrics, GetWindowLongW, GetWindowRect,
    GetWindowTextW, GetWindowThreadProcessId, IsIconic, IsWindowVisible, SetForegroundWindow,
    ShowWindow, GWL_EXSTYLE, SM_CXSCREEN, SM_CYSCREEN, SW_HIDE, SW_MINIMIZE, SW_RESTORE,
    SW_SHOW, WS_EX_TOOLWINDOW,
};

pub static TASKBAR_MODIFIED: AtomicBool = AtomicBool::new(false);
pub static NATIVE_TASKBAR_HIDDEN: AtomicBool = AtomicBool::new(false);
pub static DOCK_LOOP_STARTED: AtomicBool = AtomicBool::new(false);
pub static DOCK_HOVERED: AtomicBool = AtomicBool::new(false);
pub static FLYOUT_OPEN: AtomicBool = AtomicBool::new(false);
pub static DOCK_PINNED: AtomicBool = AtomicBool::new(false);

static ICON_CACHE: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RunningAppInfo {
    pub hwnd: isize,
    pub title: String,
    pub process_name: String,
    pub is_focused: bool,
    pub icon_hint: String, // "chrome", "edge", "code", "terminal", "explorer", "spotify", "discord", "slack", "generic"
    pub icon_data: Option<String>,
}

#[cfg(windows)]
pub unsafe fn extract_exe_icon_base64(exe_path: &str) -> Option<String> {
    if let Ok(mut cache_guard) = ICON_CACHE.lock() {
        let cache = cache_guard.get_or_insert_with(HashMap::new);
        if let Some(cached) = cache.get(exe_path) {
            return Some(cached.clone());
        }
    }

    use windows_sys::Win32::Graphics::Gdi::{
        CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
        ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        DestroyIcon, DrawIconEx, DI_NORMAL,
    };

    #[repr(C)]
    struct SHFILEINFOW {
        h_icon: HWND,
        i_icon: i32,
        dw_attributes: u32,
        sz_display_name: [u16; 260],
        sz_type_name: [u16; 80],
    }

    const SHGFI_ICON: u32 = 0x000000100;
    const SHGFI_LARGEICON: u32 = 0x000000000;

    #[link(name = "shell32")]
    extern "system" {
        fn SHGetFileInfoW(
            pszpath: *const u16,
            dwfileattributes: u32,
            psfi: *mut SHFILEINFOW,
            cbfileinfo: u32,
            uflags: u32,
        ) -> usize;
    }

    let mut path_wide: Vec<u16> = exe_path.encode_utf16().collect();
    path_wide.push(0);

    let mut shfi: SHFILEINFOW = std::mem::zeroed();
    let res = SHGetFileInfoW(
        path_wide.as_ptr(),
        0,
        &mut shfi,
        std::mem::size_of::<SHFILEINFOW>() as u32,
        SHGFI_ICON | SHGFI_LARGEICON,
    );

    if res == 0 || shfi.h_icon.is_null() {
        return None;
    }

    let hicon = shfi.h_icon;
    let width = 48i32;
    let height = 48i32;

    let screen_dc = GetDC(std::ptr::null_mut());
    let mem_dc = CreateCompatibleDC(screen_dc);
    let hbitmap = CreateCompatibleBitmap(screen_dc, width, height);
    let old_bmp = SelectObject(mem_dc, hbitmap);

    // DrawIconEx automatically scales any 16x16, 32x32, 64x64 or 256x256 icon cleanly into high-DPI 48x48 canvas
    DrawIconEx(
        mem_dc,
        0,
        0,
        hicon,
        width,
        height,
        0,
        std::ptr::null_mut(),
        DI_NORMAL,
    );

    let mut bmi: BITMAPINFO = std::mem::zeroed();
    bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
    bmi.bmiHeader.biWidth = width;
    bmi.bmiHeader.biHeight = -height; // negative for top-down orientation
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;
    bmi.bmiHeader.biCompression = BI_RGB;

    let mut bgra_pixels = vec![0u8; (width * height * 4) as usize];
    let lines = GetDIBits(
        mem_dc,
        hbitmap,
        0,
        height as u32,
        bgra_pixels.as_mut_ptr() as *mut _,
        &mut bmi,
        DIB_RGB_COLORS,
    );

    // Cleanup GDI objects immediately
    SelectObject(mem_dc, old_bmp);
    DeleteObject(hbitmap);
    DeleteDC(mem_dc);
    ReleaseDC(std::ptr::null_mut(), screen_dc);
    DestroyIcon(hicon);

    if lines == 0 {
        return None;
    }

    // Convert BGRA to RGBA with alpha channel verification
    let mut rgba_pixels = vec![0u8; (width * height * 4) as usize];
    let mut has_non_zero_alpha = false;

    for i in 0..(width * height) as usize {
        let b = bgra_pixels[i * 4];
        let g = bgra_pixels[i * 4 + 1];
        let r = bgra_pixels[i * 4 + 2];
        let a = bgra_pixels[i * 4 + 3];

        if a > 0 {
            has_non_zero_alpha = true;
        }

        rgba_pixels[i * 4] = r;
        rgba_pixels[i * 4 + 1] = g;
        rgba_pixels[i * 4 + 2] = b;
        rgba_pixels[i * 4 + 3] = a;
    }

    // If the icon lacks per-pixel alpha (older GDI format), make all visible pixels opaque
    if !has_non_zero_alpha {
        for i in 0..(width * height) as usize {
            let r = rgba_pixels[i * 4];
            let g = rgba_pixels[i * 4 + 1];
            let b = rgba_pixels[i * 4 + 2];
            if r > 0 || g > 0 || b > 0 {
                rgba_pixels[i * 4 + 3] = 255;
            }
        }
    }

    // Encode cleanly to PNG base64
    let mut png_bytes = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, width as u32, height as u32);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        if let Ok(mut writer) = encoder.write_header() {
            if writer.write_image_data(&rgba_pixels).is_err() {
                return None;
            }
        } else {
            return None;
        }
    }

    let base64_str = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    let data_url = format!("data:image/png;base64,{}", base64_str);

    if let Ok(mut cache_guard) = ICON_CACHE.lock() {
        if let Some(ref mut cache) = *cache_guard {
            cache.insert(exe_path.to_string(), data_url.clone());
        }
    }

    Some(data_url)
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

    // Query executable path for real application icon
    let mut exe_path = String::new();
    let proc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
    if !proc.is_null() {
        let mut path_buf = [0u16; 1024];
        let mut path_len = path_buf.len() as u32;
        if QueryFullProcessImageNameW(proc, 0, path_buf.as_mut_ptr(), &mut path_len) != 0 {
            exe_path = String::from_utf16_lossy(&path_buf[..path_len as usize]).to_string();
        }
        CloseHandle(proc);
    }

    let icon_data = if !exe_path.is_empty() {
        extract_exe_icon_base64(&exe_path)
    } else {
        None
    };

    let proc_file_name = if !exe_path.is_empty() {
        exe_path.split('\\').last().unwrap_or("").to_string()
    } else {
        String::new()
    };

    let icon_hint = determine_icon_hint(&title, &proc_file_name);

    list.push(RunningAppInfo {
        hwnd: hwnd as isize,
        title,
        process_name: proc_file_name,
        is_focused,
        icon_hint,
        icon_data,
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
                icon_data: None,
            },
            RunningAppInfo {
                hwnd: 102,
                title: "Visual Studio Code".to_string(),
                process_name: "code.exe".to_string(),
                is_focused: false,
                icon_hint: "code".to_string(),
                icon_data: None,
            },
            RunningAppInfo {
                hwnd: 103,
                title: "Windows Terminal".to_string(),
                process_name: "wt.exe".to_string(),
                is_focused: false,
                icon_hint: "terminal".to_string(),
                icon_data: None,
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
            return true;
        }

        if IsIconic(target) != 0 {
            ShowWindow(target, SW_RESTORE);
        } else {
            ShowWindow(target, SW_SHOW);
        }

        // Win32 Foreground Activation Bypass:
        // Windows prevents background applications from claiming foreground focus.
        // We simulate a benign ALT keydown/keyup sequence which grants the calling thread
        // the right to set the foreground window.
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            keybd_event, KEYEVENTF_KEYUP, VK_MENU,
        };
        keybd_event(VK_MENU as u8, 0, 0, 0);
        keybd_event(VK_MENU as u8, 0, KEYEVENTF_KEYUP, 0);

        SetForegroundWindow(target);
        BringWindowToTop(target);
        true
    }

    #[cfg(not(windows))]
    {
        let _ = hwnd;
        true
    }
}

/// Dynamic toggle for taskbar flyout open state (enables full 360px click zone)
#[tauri::command]
pub fn set_taskbar_flyout_open(open: bool) {
    FLYOUT_OPEN.store(open, Ordering::Relaxed);
}

/// Dynamic toggle for taskbar pin state (prevents dock auto-hide)
#[tauri::command]
pub fn set_dock_pinned(pinned: bool) {
    DOCK_PINNED.store(pinned, Ordering::Relaxed);
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

        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

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
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                true
            }
            "wifi_networks" => {
                // Try available networks flyout first, fallback to Wi-Fi settings
                let _ = Command::new("cmd")
                    .args(&["/c", "start", "ms-availablenetworks:"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                true
            }
            "bluetooth_settings" => {
                let _ = Command::new("cmd")
                    .args(&["/c", "start", "ms-settings:bluetooth"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                true
            }
            "sound_settings" => {
                let _ = Command::new("cmd")
                    .args(&["/c", "start", "ms-settings:sound"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                true
            }
            "power_settings" => {
                let _ = Command::new("cmd")
                    .args(&["/c", "start", "ms-settings:powersleep"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                true
            }
            "datetime_settings" => {
                let _ = Command::new("cmd")
                    .args(&["/c", "start", "ms-settings:dateandtime"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                true
            }
            "lock_workstation" => {
                let _ = Command::new("rundll32.exe")
                    .args(&["user32.dll,LockWorkStation"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                true
            }
            "task_manager" => {
                let _ = Command::new("taskmgr.exe").spawn();
                true
            }
            "windows_settings" => {
                let _ = Command::new("cmd")
                    .args(&["/c", "start", "ms-settings:"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                true
            }
            "sleep" => {
                let _ = Command::new("rundll32.exe")
                    .args(&["powrprof.dll,SetSuspendState", "0,1,0"])
                    .creation_flags(CREATE_NO_WINDOW)
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
        let height_px = (700.0 * scale).round() as u32;

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
        let mut dock_visible = false;
        let mut tick_counter: u32 = 0;

        loop {
            std::thread::sleep(Duration::from_millis(30));
            tick_counter = tick_counter.wrapping_add(1);

            let hover_forced = DOCK_HOVERED.load(Ordering::Relaxed);

            #[cfg(windows)]
            {
                // 1. Permanently prevent native Windows taskbar from popping up while hidden
                if NATIVE_TASKBAR_HIDDEN.load(Ordering::Relaxed) {
                    unsafe {
                        let primary = win32::get_taskbar_hwnd();
                        if !primary.is_null() && IsWindowVisible(primary) != 0 {
                            ShowWindow(primary, SW_HIDE);
                        }
                        let secondary = win32::get_secondary_taskbar_hwnd();
                        if !secondary.is_null() && IsWindowVisible(secondary) != 0 {
                            ShowWindow(secondary, SW_HIDE);
                        }
                    }
                }

                // 2. High-precision physical coordinate cursor proximity hit-test and smart auto-hide
                let success = unsafe { GetCursorPos(&mut pt) };
                if success != 0 {
                    let screen_w = unsafe { GetSystemMetrics(SM_CXSCREEN) };
                    let screen_h = unsafe { GetSystemMetrics(SM_CYSCREEN) };
                    let screen_center_x = screen_w / 2;

                    let is_flyout = FLYOUT_OPEN.load(Ordering::Relaxed);
                    let is_pinned = DOCK_PINNED.load(Ordering::Relaxed);

                    // Physical Hit-Test Choreography (40MB Edition - Stage 1):
                    // - If pinned, flyout open, or hover forced: always visible
                    // - Wake trigger: cursor touching the bottom 8px boundary (pt.y >= screen_h - 8)
                    // - Stay visible: cursor inside dock zone (pt.y >= screen_h - 74) AND |pt.x - center| <= 460
                    // - Auto-hide: cursor moves up into apps (pt.y < screen_h - 76) or moves away horizontally
                    let next_visible = if is_pinned || is_flyout || hover_forced {
                        true
                    } else if pt.y >= (screen_h - 8) && pt.y <= (screen_h + 20) {
                        true
                    } else if dock_visible
                        && pt.y >= (screen_h - 74)
                        && pt.y <= (screen_h + 20)
                        && (pt.x - screen_center_x).abs() <= 460
                    {
                        true
                    } else {
                        false
                    };

                    let inside = if is_flyout {
                        pt.y >= (screen_h - 700) && pt.y <= (screen_h + 20)
                    } else {
                        next_visible
                    };

                    // State transition notification or 60ms periodic heartbeat sync
                    let state_changed = next_visible != dock_visible;
                    if state_changed || tick_counter % 2 == 0 {
                        dock_visible = next_visible;
                        let _ = window.emit("dock-visibility", dock_visible);
                    }

                    if inside != prev_inside {
                        prev_inside = inside;
                        let _ = window.set_ignore_cursor_events(!inside);
                        let _ = window.emit("dock-hover-state", inside);
                    }
                }
            }
        }
    });
}

/// Instant query command for frontend to check dock autohide state
#[tauri::command]
pub fn poll_dock_autohide_state(flyout_open: bool, is_pinned: bool) -> bool {
    #[cfg(windows)]
    unsafe {
        let mut pt: POINT = std::mem::zeroed();
        if GetCursorPos(&mut pt) != 0 {
            let screen_w = GetSystemMetrics(SM_CXSCREEN);
            let screen_h = GetSystemMetrics(SM_CYSCREEN);
            let screen_center_x = screen_w / 2;

            if is_pinned || flyout_open {
                return true;
            }
            if pt.y >= (screen_h - 8) && pt.y <= (screen_h + 20) {
                return true;
            }
            if pt.y >= (screen_h - 74)
                && pt.y <= (screen_h + 20)
                && (pt.x - screen_center_x).abs() <= 460
            {
                return true;
            }
            return false;
        }
        false
    }
    #[cfg(not(windows))]
    {
        let _ = (flyout_open, is_pinned);
        true
    }
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