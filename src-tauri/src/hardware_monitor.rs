use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{Emitter, Manager, Window};

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

#[cfg(windows)]
#[repr(C)]
#[derive(Copy, Clone)]
struct WAVEOUTCAPSW {
    w_mid: u16,
    w_pid: u16,
    v_driver_version: u32,
    sz_pname: [u16; 32],
    dw_formats: u32,
    w_channels: u16,
    w_reserved1: u16,
    dw_support: u32,
}

#[cfg(windows)]
#[link(name = "winmm")]
extern "system" {
    fn waveOutGetNumDevs() -> u32;
    fn waveOutGetDevCapsW(u_device_id: usize, pwoc: *mut WAVEOUTCAPSW, cbwoc: u32) -> u32;
}

#[cfg(windows)]
pub fn query_audio_output_devices() -> Vec<String> {
    unsafe {
        let count = waveOutGetNumDevs();
        let mut devices = Vec::new();
        for i in 0..count {
            let mut caps: WAVEOUTCAPSW = std::mem::zeroed();
            if waveOutGetDevCapsW(i as usize, &mut caps, std::mem::size_of::<WAVEOUTCAPSW>() as u32) == 0 {
                let len = caps.sz_pname.iter().position(|&c| c == 0).unwrap_or(caps.sz_pname.len());
                let name = String::from_utf16_lossy(&caps.sz_pname[..len]).trim().to_string();
                if !name.is_empty() {
                    devices.push(name);
                }
            }
        }
        devices
    }
}

#[cfg(not(windows))]
pub fn query_audio_output_devices() -> Vec<String> {
    vec!["Default Speakers".to_string()]
}

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

/// Tauri Command: Triggers Bluetooth Connected popup toast
#[tauri::command]
pub fn trigger_bluetooth_toast(window: Window, device_name: Option<String>) {
    let name = device_name.unwrap_or_else(|| "AirBuds Pro".to_string());
    let payload = HardwareToastPayload {
        kind: "bluetooth".to_string(),
        percent: 85,
        title: "Bluetooth Connected".to_string(),
        subtitle: name.clone(),
        device_name: Some(name),
    };
    let _ = window.app_handle().emit("hardware-toast", &payload);
}

/// Spawns a background hardware monitoring thread polling battery and Bluetooth audio devices
pub fn start_hardware_monitor(window: Window) {
    if MONITOR_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        let (mut last_ac, mut _last_percent) = query_power_status();
        let mut last_audio_devices = query_audio_output_devices();
        let mut initial_run = true;
        let mut tick_count: u32 = 0;

        loop {
            std::thread::sleep(Duration::from_millis(800));
            tick_count = tick_count.wrapping_add(1);

            let (curr_ac, curr_percent) = query_power_status();

            // Skip first tick to prevent phantom notifications on application startup
            if initial_run {
                last_ac = curr_ac;
                _last_percent = curr_percent;
                last_audio_devices = query_audio_output_devices();
                initial_run = false;
                continue;
            }

            // 1. AC power status transition: 0 (battery) -> 1 (charging)
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

            // 2. Bluetooth audio device connection detector (polled every ~1.6s)
            if tick_count % 2 == 0 {
                let current_audio = query_audio_output_devices();
                if current_audio.len() > last_audio_devices.len() {
                    for dev in &current_audio {
                        if !last_audio_devices.contains(dev) {
                            let payload = HardwareToastPayload {
                                kind: "bluetooth".to_string(),
                                percent: 85,
                                title: "Bluetooth Connected".to_string(),
                                subtitle: dev.clone(),
                                device_name: Some(dev.clone()),
                            };
                            let _ = window.emit("hardware-toast", &payload);
                        }
                    }
                }
                last_audio_devices = current_audio;
            }

            last_ac = curr_ac;
            _last_percent = curr_percent;
        }
    });
}
