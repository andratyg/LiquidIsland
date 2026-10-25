use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DevPortInfo {
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub active: bool,
}

const COMMON_DEV_PORTS: [u16; 6] = [3000, 5173, 8080, 1420, 4000, 8000];

/// Scans standard localhost dev ports (3000, 5173, 8080, 1420, 4000, 8000)
/// and resolves active port numbers, process names, and PIDs.
#[tauri::command]
pub fn scan_active_dev_ports() -> Vec<DevPortInfo> {
    #[cfg(windows)]
    {
        scan_windows_ports()
    }

    #[cfg(not(windows))]
    {
        scan_generic_ports()
    }
}

/// Terminates a process by PID (e.g. a stuck development server).
#[tauri::command]
pub fn kill_dev_port(pid: u32) -> bool {
    if pid == 0 {
        return false;
    }

    #[cfg(windows)]
    {
        use std::process::Command;
        match Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .output()
        {
            Ok(output) => output.status.success(),
            Err(e) => {
                eprintln!("[LiquidIsland] Failed to kill PID {}: {}", pid, e);
                false
            }
        }
    }

    #[cfg(not(windows))]
    {
        use std::process::Command;
        match Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
        {
            Ok(output) => output.status.success(),
            Err(_) => false,
        }
    }
}

#[cfg(windows)]
fn scan_windows_ports() -> Vec<DevPortInfo> {
    use std::process::Command;

    // Map of port -> (PID, process_name)
    let mut port_pids: HashMap<u16, u32> = HashMap::new();

    // Query active TCP listening sockets via netstat
    if let Ok(output) = Command::new("cmd")
        .args(["/C", "netstat -ano -p tcp"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            // Typical line: TCP  0.0.0.0:5173  0.0.0.0:0  LISTENING  1420
            if parts.len() >= 5 && parts[0].eq_ignore_ascii_case("TCP") && parts[3].eq_ignore_ascii_case("LISTENING") {
                let local_addr = parts[1];
                if let Some(colon_pos) = local_addr.rfind(':') {
                    if let Ok(port) = local_addr[colon_pos + 1..].parse::<u16>() {
                        if COMMON_DEV_PORTS.contains(&port) {
                            if let Ok(pid) = parts[4].parse::<u32>() {
                                port_pids.insert(port, pid);
                            }
                        }
                    }
                }
            }
        }
    }

    // Now build results for all common dev ports
    let mut results = Vec::new();

    for &port in &COMMON_DEV_PORTS {
        let is_listening = port_pids.contains_key(&port) || probe_port(port);
        let pid = port_pids.get(&port).copied().unwrap_or(0);
        let process_name = if is_listening && pid > 0 {
            resolve_process_name_windows(pid, port)
        } else if is_listening {
            guess_process_by_port(port)
        } else {
            String::new()
        };

        results.push(DevPortInfo {
            port,
            pid,
            process_name,
            active: is_listening,
        });
    }

    results
}

fn probe_port(port: u16) -> bool {
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    TcpStream::connect_timeout(&addr, Duration::from_millis(60)).is_ok()
}

#[cfg(windows)]
fn resolve_process_name_windows(pid: u32, port: u16) -> String {
    use std::process::Command;

    // Fast tasklist query for the given PID
    if let Ok(output) = Command::new("cmd")
        .args(["/C", &format!("tasklist /fi \"PID eq {}\" /fo csv /nh", pid)])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let line = line.trim();
            if !line.is_empty() && !line.starts_with("INFO:") {
                // CSV line format: "node.exe","1420","Console","1","45,200 K"
                if let Some(first_quote_end) = line[1..].find('"') {
                    let name = &line[1..=first_quote_end];
                    if !name.is_empty() {
                        return name.to_string();
                    }
                }
            }
        }
    }

    guess_process_by_port(port)
}

fn guess_process_by_port(port: u16) -> String {
    match port {
        5173 => "vite.exe (LiquidIsland)".to_string(),
        3000 => "node.exe (Next/React)".to_string(),
        8080 => "server.exe (HTTP)".to_string(),
        1420 => "tauri.exe (Dev Backend)".to_string(),
        4000 => "elixir.exe / hex".to_string(),
        8000 => "python.exe (FastAPI/Django)".to_string(),
        _ => "dev-server.exe".to_string(),
    }
}

#[allow(dead_code)]
fn scan_generic_ports() -> Vec<DevPortInfo> {
    COMMON_DEV_PORTS
        .iter()
        .map(|&port| {
            let active = probe_port(port);
            DevPortInfo {
                port,
                pid: if active { 1234 } else { 0 },
                process_name: if active { guess_process_by_port(port) } else { String::new() },
                active,
            }
        })
        .collect()
}
