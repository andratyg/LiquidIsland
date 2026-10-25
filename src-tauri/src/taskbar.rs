use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{
    AppHandle, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
    WebviewWindowBuilder, Window,
};

#[cfg(windows)]
use windows_sys::Win32::Foundation::POINT;
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;

pub static TASKBAR_MODIFIED: AtomicBool = AtomicBool::new(false);
pub static DOCK_LOOP_STARTED: AtomicBool = AtomicBool::new(false);
pub static DOCK_HOVERED: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
mod win32 {
    use super::*;
    use windows_sys::Win32::Foundation::{BOOL, HWND};
    use windows_sys::Win32::Graphics::Gdi::{
        RedrawWindow, SetWindowRgn, RDW_ALLCHILDREN, RDW_ERASE, RDW_FRAME, RDW_INVALIDATE,
        RDW_UPDATENOW,
    };
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        FindWindowW, GetForegroundWindow, IsZoomed, SetWindowPos, ShowWindow, SWP_FRAMECHANGED,
        SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SWP_SHOWWINDOW, SW_SHOW,
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
    #[allow(dead_code)]
    const ACCENT_ENABLE_BLURBEHIND: u32 = 3;
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

        // 1. Reset clipping region to NULL so nothing is clipped
        SetWindowRgn(hwnd, std::ptr::null_mut(), 1);

        // 2. Ensure taskbar window is shown
        ShowWindow(hwnd, SW_SHOW);

        // 3. Inform DWM / Shell of frame changes and force redraw
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
                accent_flags: 2, // Draw all borders
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
        // Option A: Full-Width Liquid Glass (reset clipping region to NULL + apply acrylic)
        ensure_taskbar_visible_and_unclipped(hwnd);

        let color = if theme.eq_ignore_ascii_case("light") {
            0xB0F8FAFC // Semi-transparent light quartz
        } else {
            0xC0121216 // Semi-transparent obsidian dark glass
        };

        apply_acrylic_policy(hwnd, ACCENT_ENABLE_ACRYLICBLURBEHIND, color);
        TASKBAR_MODIFIED.store(true, Ordering::Relaxed);
        true
    }

    pub unsafe fn apply_option_b(hwnd: HWND, theme: &str) -> bool {
        // Option B: Transparent Acrylic on native Shell_TrayWnd so floating Liquid Glass dock capsules shine through
        ensure_taskbar_visible_and_unclipped(hwnd);

        let color = if theme.eq_ignore_ascii_case("light") {
            0x25F8FAFC // Ultra-transparent quartz
        } else {
            0x25121216 // Ultra-transparent obsidian
        };

        apply_acrylic_policy(hwnd, ACCENT_ENABLE_ACRYLICBLURBEHIND, color);
        TASKBAR_MODIFIED.store(true, Ordering::Relaxed);
        true
    }

    pub unsafe fn apply_option_c(hwnd: HWND, theme: &str) -> bool {
        // Option C: Adaptive Morph (checks if foreground active window is maximized)
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
        // Reset clipping region to default rectangular window
        ensure_taskbar_visible_and_unclipped(hwnd);
        // Reset composition attribute
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

    // Position window flush against the bottom of the primary monitor
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

    // Default clickable on startup
    let _ = window.set_ignore_cursor_events(false);

    // Start background cursor hit-test thread
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
                            let center_x = pos.x + (size.width as i32 / 2);
                            let half_dock_w = 460; // Option B dock capsules span ~900px centered
                            let in_capsule_x = (pt.x >= center_x - half_dock_w) && (pt.x <= center_x + half_dock_w);
                            let in_dock_y = pt.y >= pos.y && pt.y <= (pos.y + size.height as i32);

                            let inside = hover_forced || (in_capsule_x && in_dock_y);

                            if inside != prev_inside {
                                prev_inside = inside;
                                let _ = window.set_ignore_cursor_events(!inside);
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

        // Always ensure native taskbar is shown and unclipped
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
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // Force kill explorer.exe
        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "explorer.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        std::thread::sleep(std::time::Duration::from_millis(500));

        // Restart explorer.exe
        let _ = Command::new("explorer.exe").spawn();

        true
    }

    #[cfg(not(windows))]
    {
        true
    }
}
