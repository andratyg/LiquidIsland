pub mod memory;
pub mod taskbar;
pub mod tray;
pub mod window_manager;
pub mod window_hooks;
pub mod clipboard_ports;
pub mod media_session;
pub mod hardware_monitor;

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

            // Center window on primary monitor, restore taskbar region & start cursor hit-test loop
            if let Some(window) = app.get_webview_window("main") {
                let _ = window_manager::center_on_monitor(window.as_ref().window().clone(), 0);
                // Ensure native Windows taskbar region is clean
                taskbar::restore_default_taskbar();
                // Default clickable on startup so the Island is always interactive
                let _ = window.set_ignore_cursor_events(false);
                // Start background Win32 GetCursorPos hit-test thread (35ms)
                window_manager::start_hit_test_loop(window.as_ref().window().clone());
                // Start Windows SMTC media session polling thread (1000ms)
                media_session::start_media_session_listener(window.as_ref().window().clone());
                // Start Windows Hardware Power/Battery monitor thread (800ms)
                hardware_monitor::start_hardware_monitor(window.as_ref().window().clone());
            }

            // Spawn the dedicated bottom Liquid Glass Taskbar window ("taskbar-dock")
            if let Err(e) = taskbar::spawn_or_update_taskbar_window(app.handle()) {
                eprintln!("[LiquidIsland Taskbar] Failed to spawn taskbar dock window: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            memory::trim_ram_working_set,
            window_manager::set_click_through,
            window_manager::update_hit_box,
            window_manager::center_on_monitor,
            window_manager::get_monitors_list,
            window_manager::set_window_size,
            tray::update_tray_tooltip,
            tray::update_tray_status,
            window_hooks::toggle_pin_active_window,
            window_hooks::check_fullscreen_state,
            taskbar::apply_taskbar_mode,
            taskbar::restore_default_taskbar,
            taskbar::restart_windows_explorer,
            clipboard_ports::scan_active_dev_ports,
            clipboard_ports::kill_dev_port,
            media_session::media_play_pause,
            media_session::media_next_track,
            media_session::media_prev_track,
            hardware_monitor::get_battery_hardware_status,
            taskbar::set_dock_click_through,
        ])
        .build(tauri::generate_context!())
        .expect("error while building LiquidIsland application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // Restore Windows default taskbar on clean application shutdown
                taskbar::restore_default_taskbar();
            }
        });
}
