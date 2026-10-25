//! LiquidIsland OS - Real Windows Installed Applications Scanner & Launcher
//! Discovers all Start Menu shortcuts, system binaries, categorizes applications,
//! extracts base64 PNG icons via Win32 DrawIconEx, and launches without console flashing.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstalledAppEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub icon_data: Option<String>,
    pub category: String, // "System", "Development", "Productivity", "Media", "Application"
    pub is_running: bool,
}

static APPS_CACHE: Mutex<Option<Vec<InstalledAppEntry>>> = Mutex::new(None);

/// Categorizes discovered app based on display name and path
fn categorize_app(name: &str, _path: &str) -> String {
    let n = name.to_lowercase();
    if n.contains("code")
        || n.contains("terminal")
        || n.contains("powershell")
        || n.contains("cmd")
        || n.contains("git")
        || n.contains("node")
        || n.contains("rust")
        || n.contains("studio")
        || n.contains("intellij")
        || n.contains("pycharm")
        || n.contains("cursor")
        || n.contains("sublime")
        || n.contains("postman")
    {
        "Development".to_string()
    } else if n.contains("spotify")
        || n.contains("music")
        || n.contains("vlc")
        || n.contains("media")
        || n.contains("video")
        || n.contains("audio")
        || n.contains("camera")
        || n.contains("obs")
        || n.contains("audacity")
        || n.contains("premiere")
    {
        "Media".to_string()
    } else if n.contains("chrome")
        || n.contains("edge")
        || n.contains("brave")
        || n.contains("firefox")
        || n.contains("mail")
        || n.contains("slack")
        || n.contains("discord")
        || n.contains("teams")
        || n.contains("notion")
        || n.contains("word")
        || n.contains("excel")
        || n.contains("powerpoint")
        || n.contains("outlook")
        || n.contains("telegram")
        || n.contains("whatsapp")
    {
        "Productivity".to_string()
    } else if n.contains("settings")
        || n.contains("control panel")
        || n.contains("task manager")
        || n.contains("explorer")
        || n.contains("calculator")
        || n.contains("notepad")
        || n.contains("paint")
        || n.contains("snipping")
    {
        "System".to_string()
    } else {
        "Application".to_string()
    }
}

/// Recursively scans directory for `.lnk` shortcuts and `.exe` applications
#[cfg(windows)]
fn scan_directory_for_shortcuts(
    dir: &Path,
    results: &mut Vec<InstalledAppEntry>,
    seen_names: &mut HashSet<String>,
) {
    if !dir.exists() || !dir.is_dir() {
        return;
    }

    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                scan_directory_for_shortcuts(&path, results, seen_names);
            } else if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                let ext_lower = ext.to_lowercase();
                if ext_lower == "lnk" || ext_lower == "exe" {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        let name = stem.trim().to_string();
                        let name_lower = name.to_lowercase();

                        // Filter out uninstallers, help, and website links
                        if name_lower.contains("uninstall")
                            || name_lower.contains("unins00")
                            || name_lower.contains("help")
                            || name_lower.contains("readme")
                            || name_lower.starts_with("install")
                            || name_lower == "setup"
                        {
                            continue;
                        }

                        if seen_names.contains(&name_lower) {
                            continue;
                        }
                        seen_names.insert(name_lower.clone());

                        let path_str = path.to_string_lossy().to_string();
                        let icon_data = unsafe { crate::taskbar::extract_exe_icon_base64(&path_str) };
                        let category = categorize_app(&name, &path_str);

                        results.push(InstalledAppEntry {
                            id: format!("app-{}", results.len() + 1),
                            name,
                            path: path_str,
                            icon_data,
                            category,
                            is_running: false,
                        });
                    }
                }
            }
        }
    }
}

/// Adds common Windows built-in system tools
#[cfg(windows)]
fn add_system_tools(results: &mut Vec<InstalledAppEntry>, seen_names: &mut HashSet<String>) {
    let tools = [
        ("Calculator", "calc.exe", "System"),
        ("Notepad", "notepad.exe", "System"),
        ("File Explorer", "explorer.exe", "System"),
        ("Task Manager", "taskmgr.exe", "System"),
        ("Windows Terminal", "wt.exe", "Development"),
        ("PowerShell", "powershell.exe", "Development"),
        ("Control Panel", "control.exe", "System"),
        ("Windows Settings", "ms-settings:", "System"),
    ];

    for (name, path, category) in tools {
        let name_lower = name.to_lowercase();
        if seen_names.contains(&name_lower) {
            continue;
        }
        seen_names.insert(name_lower);

        let icon_data = if !path.starts_with("ms-") {
            unsafe { crate::taskbar::extract_exe_icon_base64(path) }
        } else {
            None
        };

        results.push(InstalledAppEntry {
            id: format!("app-sys-{}", results.len() + 1),
            name: name.to_string(),
            path: path.to_string(),
            icon_data,
            category: category.to_string(),
            is_running: false,
        });
    }
}

/// Retrieves all installed and system applications (cached in memory)
#[tauri::command]
pub fn get_installed_apps() -> Vec<InstalledAppEntry> {
    if let Ok(guard) = APPS_CACHE.lock() {
        if let Some(ref cached) = *guard {
            let running = crate::taskbar::get_running_apps();
            let running_names: HashSet<String> = running
                .iter()
                .map(|r| r.process_name.to_lowercase())
                .collect();

            return cached
                .iter()
                .map(|app| {
                    let mut copy = app.clone();
                    let app_file = Path::new(&app.path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_lowercase();
                    copy.is_running = running_names.iter().any(|rn| {
                        !rn.is_empty() && (rn.contains(&app_file) || app_file.contains(rn))
                    });
                    copy
                })
                .collect();
        }
    }

    #[cfg(windows)]
    {
        let mut apps = Vec::new();
        let mut seen = HashSet::new();

        // 1. ProgramData Start Menu Programs
        if let Ok(program_data) = std::env::var("ProgramData") {
            let p = PathBuf::from(program_data).join(r"Microsoft\Windows\Start Menu\Programs");
            scan_directory_for_shortcuts(&p, &mut apps, &mut seen);
        }

        // 2. User AppData Start Menu Programs
        if let Ok(app_data) = std::env::var("APPDATA") {
            let p = PathBuf::from(app_data).join(r"Microsoft\Windows\Start Menu\Programs");
            scan_directory_for_shortcuts(&p, &mut apps, &mut seen);
        }

        // 3. System core tools
        add_system_tools(&mut apps, &mut seen);

        // Sort alphabetically
        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        if let Ok(mut guard) = APPS_CACHE.lock() {
            *guard = Some(apps.clone());
        }

        apps
    }

    #[cfg(not(windows))]
    {
        vec![
            InstalledAppEntry {
                id: "mock-1".to_string(),
                name: "Google Chrome".to_string(),
                path: "chrome.exe".to_string(),
                icon_data: None,
                category: "Productivity".to_string(),
                is_running: true,
            },
            InstalledAppEntry {
                id: "mock-2".to_string(),
                name: "Visual Studio Code".to_string(),
                path: "code.exe".to_string(),
                icon_data: None,
                category: "Development".to_string(),
                is_running: true,
            },
            InstalledAppEntry {
                id: "mock-3".to_string(),
                name: "Spotify".to_string(),
                path: "spotify.exe".to_string(),
                icon_data: None,
                category: "Media".to_string(),
                is_running: false,
            },
            InstalledAppEntry {
                id: "mock-4".to_string(),
                name: "Windows Terminal".to_string(),
                path: "wt.exe".to_string(),
                icon_data: None,
                category: "Development".to_string(),
                is_running: false,
            },
            InstalledAppEntry {
                id: "mock-5".to_string(),
                name: "Calculator".to_string(),
                path: "calc.exe".to_string(),
                icon_data: None,
                category: "System".to_string(),
                is_running: false,
            },
        ]
    }
}

/// Launches an application or shortcut via Windows `start` without flashing a console window
#[tauri::command]
pub fn launch_installed_app(path: String) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if path.starts_with("ms-") {
            let _ = Command::new("cmd")
                .args(&["/c", "start", "", &path])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
            return true;
        }

        let _ = Command::new("cmd")
            .args(&["/c", "start", "", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
        true
    }

    #[cfg(not(windows))]
    {
        let _ = path;
        true
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileMetadataInfo {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub formatted_size: String,
    pub extension: String,
    pub is_image: bool,
    pub is_text: bool,
    pub text_preview: Option<String>,
}

#[tauri::command]
pub fn inspect_dropped_file(path: String) -> FileMetadataInfo {
    let p = Path::new(&path);
    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let ext = p
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let meta = std::fs::metadata(&path).ok();
    let size_bytes = meta.as_ref().map(|m| m.len()).unwrap_or(0);
    let formatted_size = if size_bytes >= 1_048_576 {
        format!("{:.1} MB", size_bytes as f64 / 1_048_576.0)
    } else if size_bytes >= 1024 {
        format!("{:.0} KB", size_bytes as f64 / 1024.0)
    } else if size_bytes > 0 {
        format!("{} B", size_bytes)
    } else {
        "0 B".to_string()
    };

    let is_image = matches!(
        ext.as_str(),
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "svg" | "bmp" | "ico"
    );
    let is_text = matches!(
        ext.as_str(),
        "txt"
            | "md"
            | "json"
            | "js"
            | "ts"
            | "tsx"
            | "jsx"
            | "rs"
            | "py"
            | "html"
            | "css"
            | "xml"
            | "yaml"
            | "yml"
            | "sh"
            | "bat"
            | "c"
            | "cpp"
            | "h"
    );

    let mut text_preview = None;
    if is_text && size_bytes < 500_000 {
        if let Ok(content) = std::fs::read_to_string(&path) {
            let sample: String = content.chars().take(400).collect();
            text_preview = Some(sample);
        }
    }

    FileMetadataInfo {
        name,
        path,
        size_bytes,
        formatted_size,
        extension: ext,
        is_image,
        is_text,
        text_preview,
    }
}

#[tauri::command]
pub fn open_file_in_explorer(path: String) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = std::process::Command::new("explorer.exe")
            .arg(format!("/select,\"{}\"", path))
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
        true
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        true
    }
}

#[tauri::command]
pub fn open_file_default(path: String) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = std::process::Command::new("cmd")
            .args(&["/c", "start", "", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
        true
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        true
    }
}

