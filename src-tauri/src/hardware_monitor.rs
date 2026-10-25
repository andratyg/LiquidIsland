use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{Emitter, Window};

#[cfg(windows)]
use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HardwareToastPayload {
    pub kind: String, // "charging" | "unplugged" | "bluetooth"
    pub percent: u8,
    pub title: String,
    pub subtitle: String,
    pub device_name: Option<String>,
}

pub static MONITOR_STARTED: AtomicBool = AtomicBool::new(false);

/// Queries current battery status from Win32 GetSystemPowerStatus
pub fn query_power_status() -> (u8, u8) {
    #[cfg(windows)]
    unsafe {
        let mut sps: SYSTEM_POWER_STATUS = std::mem::zeroed();
        if GetSystemPowerStatus(&mut sps) != 0 {
            let ac_status = sps.ACLineStatus; // 0 = offline (battery), 1 = online (charging), 255 = unknown
            let percent = if sps.BatteryLifePercent <= 100 {
                sps.BatteryLifePercent
            } else {
                84 // Fallback default if desktop without battery
            };
            return (ac_status, percent);
        }
    }
    // Non-windows or failure fallback
    (1, 84)
}

/// Tauri Command: Returns current real hardware power status
#[tauri::command]
pub fn get_battery_hardware_status() -> HardwareToastPayload {
    let (ac, percent) = query_power_status();
    let is_charging = ac == 1;

    HardwareToastPayload {
        kind: if is_charging { "charging".to_string() } else { "unplugged".to_string() },
        percent,
        title: if is_charging { "Charging".to_string() } else { "Charger unplugged".to_string() },
        subtitle: if is_charging {
            "Charger connected".to_string()
        } else {
            format!("{}% remaining", percent)
        },
        device_name: None,
    }
}

/// Spawns a background hardware monitoring thread polling every 800ms
pub fn start_hardware_monitor(window: Window) {
    if MONITOR_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        let (mut last_ac, mut _last_percent) = query_power_status();
        let mut initial_run = true;

        loop {
            std::thread::sleep(Duration::from_millis(800));

            let (curr_ac, curr_percent) = query_power_status();

            // Skip first tick to prevent phantom notifications on application startup
            if initial_run {
                last_ac = curr_ac;
                _last_percent = curr_percent;
                initial_run = false;
                continue;
            }

            // AC status transition: 0 (battery) -> 1 (charging)
            if last_ac == 0 && curr_ac == 1 {
                let payload = HardwareToastPayload {
                    kind: "charging".to_string(),
                    percent: curr_percent,
                    title: "Charging".to_string(),
                    subtitle: "Charger connected".to_string(),
                    device_name: None,
                };
                let _ = window.emit("hardware-toast", &payload);
            }
            // AC status transition: 1 (charging) -> 0 (unplugged)
            else if last_ac == 1 && curr_ac == 0 {
                let payload = HardwareToastPayload {
                    kind: "unplugged".to_string(),
                    percent: curr_percent,
                    title: "Charger unplugged".to_string(),
                    subtitle: format!("{}% remaining", curr_percent),
                    device_name: None,
                };
                let _ = window.emit("hardware-toast", &payload);
            }

            last_ac = curr_ac;
            _last_percent = curr_percent;
        }
    });
}
