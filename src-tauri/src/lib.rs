pub mod memory;
pub mod taskbar;
pub mod tray;
pub mod window_manager;
pub mod window_hooks;
pub mod clipboard_ports;
pub mod media_session;
pub mod hardware_monitor;
pub mod app_launcher;
pub mod screen_capture;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Start the 25-second periodic RAM trimmer daemon
            memory::start_ram_trimmer_thread();

            // Initial memory trim
            memory::trim_ram_working_set_internal(true);

            // Create native Windows System Tray (^) and context menu
            if let Err(e) = tray::create_tray(app.handle()) {
                eprintln!("[LiquidIsland Tray] Failed to initialize system tray: {}", e);
            }

            // Center window on primary monitor, restore taskbar region & start cursor hit-test loop
            if let Some(window) = app.get_webview_window("main") {
                let _ = window_manager::center_on_monitor(window.as_ref().window().clone(), 0);
                // Suppress native Windows taskbar so LiquidIsland dock has exclusive control
                taskbar::set_native_taskbar_hidden(true);
                // Default clickable on startup so the Island is always interactive
                let _ = window.set_ignore_cursor_events(false);
                // Start background Win32 GetCursorPos hit-test thread (35ms)
                window_manager::start_hit_test_loop(window.as_ref().window().clone());
                // Start Windows SMTC media session polling thread (1000ms)
                media_session::start_media_session_listener(window.as_ref().window().clone());
                // Start Windows Hardware Power/Battery monitor thread (800ms)
                hardware_monitor::start_hardware_monitor(window.as_ref().window().clone());
                // Start Windows Tab/App Switch & Virtual Desktop activity monitor thread (200ms)
                window_hooks::start_workspace_activity_listener(window.as_ref().window().clone());
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
            hardware_monitor::trigger_bluetooth_toast,
            hardware_monitor::get_system_master_volume,
            hardware_monitor::set_system_master_volume,
            taskbar::set_dock_click_through,
            taskbar::set_native_taskbar_hidden,
            taskbar::get_running_apps,
            taskbar::focus_or_toggle_app,
            taskbar::launch_system_action,
            taskbar::set_taskbar_flyout_open,
            taskbar::set_dock_pinned,
            taskbar::poll_dock_autohide_state,
            app_launcher::get_installed_apps,
            app_launcher::launch_installed_app,
            app_launcher::inspect_dropped_file,
            app_launcher::open_file_in_explorer,
            app_launcher::open_file_default,
            screen_capture::capture_fullscreen,
            screen_capture::capture_active_window,
            screen_capture::open_snipping_tool,
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
