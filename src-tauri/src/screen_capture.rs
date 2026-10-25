//! LiquidIsland OS - Native Win32 Screen Capture & Clipboard Interceptor (40MB Edition - Stage 1)
//! Provides high-speed GDI screen capture (fullscreen, active window, snipping tool)
//! and automatic clipboard bitmap extraction with base64 PNG serialization.

use base64::Engine;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(windows)]
use windows_sys::Win32::Foundation::RECT;
#[cfg(windows)]
use windows_sys::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, SRCCOPY,
};
#[cfg(windows)]
use windows_sys::Win32::System::DataExchange::{
    CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetSystemMetrics, GetWindowRect,
    GetWindowThreadProcessId, SM_CXSCREEN, SM_CYSCREEN,
};

pub const CF_BITMAP: u32 = 2;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CaptureResult {
    pub success: bool,
    pub data_url: String,
    pub filename: String,
    pub width: u32,
    pub height: u32,
}

/// Generates a clean timestamped filename for screenshots (e.g. "Screenshot_20261025_173000.png")
pub fn generate_screenshot_filename() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("Screenshot_{}.png", now)
}

/// Encodes raw RGBA pixels into a base64 PNG data URL using the `png` crate
pub fn encode_rgba_to_png_data_url(rgba_pixels: &[u8], width: u32, height: u32) -> Result<String, String> {
    let mut png_bytes = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, width, height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder
            .write_header()
            .map_err(|e| format!("PNG header error: {}", e))?;
        writer
            .write_image_data(rgba_pixels)
            .map_err(|e| format!("PNG data write error: {}", e))?;
    }

    let base64_str = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    Ok(format!("data:image/png;base64,{}", base64_str))
}

/// Captures a specified rectangular region of the screen using Win32 GDI
#[cfg(windows)]
pub unsafe fn capture_gdi_rect(x: i32, y: i32, width: i32, height: i32) -> Result<CaptureResult, String> {
    if width <= 0 || height <= 0 {
        return Err("Invalid capture dimensions".to_string());
    }

    let screen_dc = GetDC(std::ptr::null_mut());
    if screen_dc.is_null() {
        return Err("Failed to obtain screen DC".to_string());
    }

    let mem_dc = CreateCompatibleDC(screen_dc);
    if mem_dc.is_null() {
        ReleaseDC(std::ptr::null_mut(), screen_dc);
        return Err("Failed to create compatible memory DC".to_string());
    }

    let hbitmap = CreateCompatibleBitmap(screen_dc, width, height);
    if hbitmap.is_null() {
        DeleteDC(mem_dc);
        ReleaseDC(std::ptr::null_mut(), screen_dc);
        return Err("Failed to create compatible bitmap".to_string());
    }

    let old_bmp = SelectObject(mem_dc, hbitmap);
    let blit_ok = BitBlt(mem_dc, 0, 0, width, height, screen_dc, x, y, SRCCOPY);

    SelectObject(mem_dc, old_bmp);

    if blit_ok == 0 {
        DeleteObject(hbitmap);
        DeleteDC(mem_dc);
        ReleaseDC(std::ptr::null_mut(), screen_dc);
        return Err("BitBlt screen copy failed".to_string());
    }

    // Prepare BITMAPINFO for 32-bit RGBA extraction
    let mut bmi: BITMAPINFO = std::mem::zeroed();
    bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
    bmi.bmiHeader.biWidth = width;
    bmi.bmiHeader.biHeight = -height; // Top-down DIB
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;
    bmi.bmiHeader.biCompression = BI_RGB as u32;

    let total_pixels = (width * height) as usize;
    let mut bgra_pixels: Vec<u8> = vec![0u8; total_pixels * 4];

    let lines = GetDIBits(
        mem_dc,
        hbitmap,
        0,
        height as u32,
        bgra_pixels.as_mut_ptr() as *mut _,
        &mut bmi,
        DIB_RGB_COLORS,
    );

    DeleteDC(mem_dc);
    ReleaseDC(std::ptr::null_mut(), screen_dc);

    if lines == 0 {
        DeleteObject(hbitmap);
        return Err("GetDIBits failed to read pixels".to_string());
    }

    // Convert BGRA to RGBA with full alpha
    let mut rgba_pixels: Vec<u8> = vec![0u8; total_pixels * 4];
    for i in 0..total_pixels {
        let b = bgra_pixels[i * 4];
        let g = bgra_pixels[i * 4 + 1];
        let r = bgra_pixels[i * 4 + 2];
        rgba_pixels[i * 4] = r;
        rgba_pixels[i * 4 + 1] = g;
        rgba_pixels[i * 4 + 2] = b;
        rgba_pixels[i * 4 + 3] = 255;
    }

    // Place bitmap on Windows Clipboard
    if OpenClipboard(std::ptr::null_mut()) != 0 {
        EmptyClipboard();
        SetClipboardData(CF_BITMAP, hbitmap);
        CloseClipboard();
        // Windows now owns hbitmap, do NOT call DeleteObject(hbitmap)
    } else {
        DeleteObject(hbitmap);
    }

    let data_url = encode_rgba_to_png_data_url(&rgba_pixels, width as u32, height as u32)?;
    let filename = generate_screenshot_filename();

    Ok(CaptureResult {
        success: true,
        data_url,
        filename,
        width: width as u32,
        height: height as u32,
    })
}

/// Tauri command to capture the full primary screen
#[tauri::command]
pub fn capture_fullscreen() -> Result<CaptureResult, String> {
    #[cfg(windows)]
    unsafe {
        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);
        capture_gdi_rect(0, 0, screen_w, screen_h)
    }

    #[cfg(not(windows))]
    {
        Ok(CaptureResult {
            success: true,
            data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==".to_string(),
            filename: generate_screenshot_filename(),
            width: 1920,
            height: 1080,
        })
    }
}

/// Tauri command to capture the currently active foreground window
#[tauri::command]
pub fn capture_active_window() -> Result<CaptureResult, String> {
    #[cfg(windows)]
    unsafe {
        let hwnd = GetForegroundWindow();
        let desktop = GetDesktopWindow();
        let shell = GetShellWindow();

        // If foreground is invalid, shell, or desktop, fallback to fullscreen
        if hwnd.is_null() || hwnd == desktop || hwnd == shell {
            return capture_fullscreen();
        }

        // Avoid capturing LiquidIsland itself if accidentally focused
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == std::process::id() {
            // Find another active window or fallback to fullscreen
            return capture_fullscreen();
        }

        let mut rect: RECT = std::mem::zeroed();
        if GetWindowRect(hwnd, &mut rect) == 0 {
            return capture_fullscreen();
        }

        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;

        if width <= 10 || height <= 10 {
            return capture_fullscreen();
        }

        capture_gdi_rect(rect.left, rect.top, width, height)
    }

    #[cfg(not(windows))]
    {
        capture_fullscreen()
    }
}

/// Tauri command to launch the native Windows Snipping Tool overlay
#[tauri::command]
pub fn open_snipping_tool() -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // Try ms-screenclip: protocol via explorer.exe
        let status = Command::new("explorer.exe")
            .arg("ms-screenclip:")
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        if let Ok(s) = status {
            if s.success() {
                return true;
            }
        }

        // Fallback to SnippingTool.exe
        let _ = Command::new("SnippingTool.exe")
            .arg("/clip")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        true
    }

    #[cfg(not(windows))]
    {
        true
    }
}
