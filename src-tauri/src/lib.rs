pub mod memory;
pub mod tray;
pub mod window_manager;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Start the 25-second periodic RAM trimmer daemon
            memory::start_ram_trimmer_thread();

            // Initial memory trim
            memory::trim_ram_working_set_internal();

            // Create native Windows System Tray (^) and context menu
            if let Err(e) = tray::create_tray(app.handle()) {
                eprintln!("[LiquidIsland Tray] Failed to initialize system tray: {}", e);
            }

            // Center window on primary monitor & set initial click-through
            if let Some(window) = app.get_webview_window("main") {
                let _ = window_manager::center_on_monitor(window.as_ref().window().clone(), 0);
                let _ = window.set_ignore_cursor_events(true);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            memory::trim_ram_working_set,
            window_manager::set_click_through,
            window_manager::center_on_monitor,
            window_manager::get_monitors_list,
            tray::update_tray_tooltip,
            tray::update_tray_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LiquidIsland application");
}
