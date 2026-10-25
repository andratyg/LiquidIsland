use std::sync::atomic::{AtomicBool, Ordering};

pub static TASKBAR_MODIFIED: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
mod win32 {
    use super::*;
    use windows_sys::Win32::Foundation::{BOOL, HWND, RECT};
    use windows_sys::Win32::Graphics::Gdi::{
        CombineRgn, CreateRoundRectRgn, DeleteObject, SetWindowRgn, HRGN, RGN_OR,
    };
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        FindWindowW, GetForegroundWindow, GetWindowRect, IsZoomed,
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
        // Option A: Full-Width Liquid Glass (reset clipping region + apply acrylic)
        SetWindowRgn(hwnd, std::ptr::null_mut(), 1);

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
        // Option B: Floating 2-Capsule Dock (create rounded region + apply acrylic)
        let mut rect: RECT = std::mem::zeroed();
        if GetWindowRect(hwnd, &mut rect) == 0 {
            return false;
        }

        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;

        if width <= 0 || height <= 0 {
            return false;
        }

        // Capsule 1: Left App Dock (Start + Pinned apps)
        let left_cap_width = (width as f32 * 0.48) as i32;
        let left_rgn: HRGN = CreateRoundRectRgn(8, 4, left_cap_width, height - 4, 16, 16);

        // Capsule 2: Right System Tray (Tray icons + Clock)
        let right_cap_width = (width as f32 * 0.32) as i32;
        let right_rgn: HRGN =
            CreateRoundRectRgn(width - right_cap_width, 4, width - 8, height - 4, 16, 16);

        if !left_rgn.is_null() && !right_rgn.is_null() {
            let combined_rgn: HRGN = CreateRoundRectRgn(0, 0, 0, 0, 0, 0);
            CombineRgn(combined_rgn, left_rgn, right_rgn, RGN_OR);
            SetWindowRgn(hwnd, combined_rgn, 1);

            DeleteObject(left_rgn);
            DeleteObject(right_rgn);
        } else if !left_rgn.is_null() {
            SetWindowRgn(hwnd, left_rgn, 1);
        }

        let color = if theme.eq_ignore_ascii_case("light") {
            0xCCF8FAFC
        } else {
            0xD0121216
        };

        apply_acrylic_policy(hwnd, ACCENT_ENABLE_ACRYLICBLURBEHIND, color);
        TASKBAR_MODIFIED.store(true, Ordering::Relaxed);
        true
    }

    pub unsafe fn apply_option_c(hwnd: HWND, theme: &str) -> bool {
        // Option C: Adaptive Morph (checks if foreground active window is maximized)
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
        SetWindowRgn(hwnd, std::ptr::null_mut(), 1);
        // Reset composition attribute
        apply_acrylic_policy(hwnd, ACCENT_DISABLED, 0);
        TASKBAR_MODIFIED.store(false, Ordering::Relaxed);
        true
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
