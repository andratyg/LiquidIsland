use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};
use crate::memory;

#[derive(Clone, serde::Serialize)]
pub struct TrayActionPayload {
    pub action: String,
    pub ram_mb: Option<f64>,
}

pub const TRAY_ID: &str = "main-tray";
pub const DEFAULT_TOOLTIP: &str = "LiquidIsland OS - Active (~9.2 MB RAM)";

/// Builds the native Windows System Tray icon, menu, and event handlers
pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_settings = MenuItemBuilder::with_id("open_settings", "Settings Dashboard & Studio (⚙️)")
        .build(app)?;
    let toggle_power = MenuItemBuilder::with_id("toggle_power", "Enable / Disable Dynamic Island (On/Off)")
        .build(app)?;
    let stealth_bezel = MenuItemBuilder::with_id("stealth_bezel", "Sembunyikan ke Garis Bezel (Stealth Mode)")
        .build(app)?;
    let switch_theme = MenuItemBuilder::with_id("switch_theme", "Ganti Tema: Liquid Dark / Light Glass")
        .build(app)?;
    let switch_companion = MenuItemBuilder::with_id("switch_companion", "Ganti Karakter: Slime (B) / Cat (C) / Eyes")
        .build(app)?;
    let toggle_lofi = MenuItemBuilder::with_id("toggle_lofi", "Fitur Lofi Focus Audio (On/Off)")
        .build(app)?;
    let cycle_taskbar = MenuItemBuilder::with_id("cycle_taskbar", "Mode Taskbar: Opsi A / B / C")
        .build(app)?;
    let toggle_dev = MenuItemBuilder::with_id("toggle_dev_controls", "Developer Controls Toolbar (Ctrl+Shift+D)")
        .build(app)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let trim_ram = MenuItemBuilder::with_id("trim_ram", "Optimize RAM Now (~10 MB Trimmer)")
        .build(app)?;
    let quit_app = MenuItemBuilder::with_id("quit_app", "Quit LiquidIsland OS")
        .build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[
            &open_settings,
            &toggle_power,
            &stealth_bezel,
            &switch_theme,
            &switch_companion,
            &toggle_lofi,
            &cycle_taskbar,
            &toggle_dev,
            &sep,
            &trim_ram,
            &quit_app,
        ])
        .build()?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip(DEFAULT_TOOLTIP)
        .menu(&menu)
        .show_menu_on_left_click(false);

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let is_visible = window.is_visible().unwrap_or(true);
                    if !is_visible {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let payload = TrayActionPayload {
                            action: "wake_and_compact".to_string(),
                            ram_mb: None,
                        };
                        let _ = window.emit("tray-menu-action", &payload);
                        let _ = window.emit("tray-command", &payload);
                    } else {
                        let payload = TrayActionPayload {
                            action: "toggle_expand".to_string(),
                            ram_mb: None,
                        };
                        let _ = window.emit("tray-menu-action", &payload);
                        let _ = window.emit("tray-command", &payload);
                    }
                }
            }
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "open_settings" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let payload = TrayActionPayload {
                            action: "open_settings".to_string(),
                            ram_mb: None,
                        };
                        let _ = window.emit("tray-menu-action", &payload);
                        let _ = window.emit("tray-command", &payload);
                    }
                }
                "toggle_power" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let is_visible = window.is_visible().unwrap_or(true);
                        if is_visible {
                            let _ = window.hide();
                            let ram = memory::trim_ram_working_set_internal();
                            let payload = TrayActionPayload {
                                action: "toggle_power".to_string(),
                                ram_mb: Some(ram),
                            };
                            let _ = window.emit("tray-menu-action", &payload);
                            let _ = window.emit("tray-command", &payload);
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let payload = TrayActionPayload {
                                action: "toggle_power".to_string(),
                                ram_mb: None,
                            };
                            let _ = window.emit("tray-menu-action", &payload);
                            let _ = window.emit("tray-command", &payload);
                        }
                    }
                }
                "stealth_bezel" => {
                    let payload = TrayActionPayload {
                        action: "stealth_bezel".to_string(),
                        ram_mb: None,
                    };
                    let _ = app.emit("tray-menu-action", &payload);
                    let _ = app.emit("tray-command", &payload);
                }
                "switch_theme" => {
                    let payload = TrayActionPayload {
                        action: "switch_theme".to_string(),
                        ram_mb: None,
                    };
                    let _ = app.emit("tray-menu-action", &payload);
                    let _ = app.emit("tray-command", &payload);
                }
                "switch_companion" => {
                    let payload = TrayActionPayload {
                        action: "switch_companion".to_string(),
                        ram_mb: None,
                    };
                    let _ = app.emit("tray-menu-action", &payload);
                    let _ = app.emit("tray-command", &payload);
                }
                "toggle_lofi" => {
                    let payload = TrayActionPayload {
                        action: "toggle_lofi".to_string(),
                        ram_mb: None,
                    };
                    let _ = app.emit("tray-menu-action", &payload);
                    let _ = app.emit("tray-command", &payload);
                }
                "cycle_taskbar" => {
                    let payload = TrayActionPayload {
                        action: "cycle_taskbar".to_string(),
                        ram_mb: None,
                    };
                    let _ = app.emit("tray-menu-action", &payload);
                    let _ = app.emit("tray-command", &payload);
                }
                "toggle_dev_controls" => {
                    let payload = TrayActionPayload {
                        action: "toggle_dev_controls".to_string(),
                        ram_mb: None,
                    };
                    let _ = app.emit("tray-menu-action", &payload);
                    let _ = app.emit("tray-command", &payload);
                }
                "trim_ram" => {
                    let ram_mb = memory::trim_ram_working_set_internal();
                    if let Some(tray) = app.tray_by_id(TRAY_ID) {
                        let tooltip = format!("LiquidIsland OS - Active (~{:.1} MB RAM)", ram_mb);
                        let _ = tray.set_tooltip(Some(tooltip));
                    }
                    let payload = TrayActionPayload {
                        action: "trim_ram".to_string(),
                        ram_mb: Some(ram_mb),
                    };
                    let _ = app.emit("tray-menu-action", &payload);
                    let _ = app.emit("tray-command", &payload);
                }
                "quit_app" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

/// Tauri command to dynamically update tray tooltip from frontend
#[tauri::command]
pub fn update_tray_tooltip(app: AppHandle, status_text: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_tooltip(Some(status_text))
            .map_err(|e| format!("Failed to update tray tooltip: {}", e))
    } else {
        Err(format!("Tray icon '{}' not found", TRAY_ID))
    }
}

/// Alias Tauri command for update_tray_status
#[tauri::command]
pub fn update_tray_status(app: AppHandle, status_text: String) -> Result<(), String> {
    update_tray_tooltip(app, status_text)
}
