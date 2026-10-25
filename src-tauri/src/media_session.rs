use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{Emitter, Window};

#[cfg(windows)]
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SystemMediaPayload {
    pub title: String,
    pub artist: String,
    pub album_title: String,
    pub is_playing: bool,
    pub position_secs: u64,
    pub duration_secs: u64,
    pub source_app: String,
    pub thumbnail_base64: Option<String>,
    pub has_media: bool,
}

pub static MEDIA_LOOP_STARTED: AtomicBool = AtomicBool::new(false);

/// Resolves a human-friendly source application name from the AppUserModelId or window title
fn resolve_source_app(app_id: &str, title: &str) -> String {
    let app_lower = app_id.to_lowercase();
    let title_lower = title.to_lowercase();

    if app_lower.contains("spotify") {
        "Spotify".to_string()
    } else if title_lower.contains("youtube music") || app_lower.contains("youtubemusic") {
        "YouTube Music".to_string()
    } else if app_lower.contains("chrome")
        || app_lower.contains("edge")
        || app_lower.contains("brave")
        || app_lower.contains("firefox")
        || app_lower.contains("opera")
        || app_lower.contains("vivaldi")
    {
        if title_lower.contains("youtube") {
            "YouTube".to_string()
        } else {
            "YouTube / Browser".to_string()
        }
    } else if app_lower.contains("apple") || app_lower.contains("itunes") {
        "Apple Music".to_string()
    } else if !app_id.is_empty() {
        "Windows Media".to_string()
    } else {
        "Media Player".to_string()
    }
}

/// Helper: Strips common web browser suffixes from window titles
#[cfg(windows)]
fn strip_browser_suffix(s: &str) -> String {
    let mut text = s.to_string();
    let suffixes = [
        " - Google Chrome",
        " - Microsoft Edge",
        " - Brave",
        " - Opera",
        " - Vivaldi",
        " — Mozilla Firefox",
        " - Mozilla Firefox",
        " - Chromium",
    ];
    for suf in suffixes {
        if let Some(stripped) = text.strip_suffix(suf) {
            text = stripped.to_string();
            break;
        }
    }
    text.trim().to_string()
}

/// Helper: Splits "Artist - Song Title" into (Artist, Song Title)
#[cfg(windows)]
fn parse_artist_track(raw: &str, default_artist: &str) -> (String, String) {
    if let Some((artist, track)) = raw.split_once(" - ") {
        (artist.trim().to_string(), track.trim().to_string())
    } else {
        (default_artist.to_string(), raw.trim().to_string())
    }
}

/// Engine A: WinRT SMTC (Session Manager)
#[cfg(windows)]
fn query_engine_a_smtc() -> Result<SystemMediaPayload, Box<dyn std::error::Error>> {
    let manager_op = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?;
    let manager = manager_op.join()?;

    let mut best_session: Option<GlobalSystemMediaTransportControlsSession> = None;
    let mut fallback_session: Option<GlobalSystemMediaTransportControlsSession> = None;

    if let Ok(sessions) = manager.GetSessions() {
        for session in sessions {
            if let Ok(playback_info) = session.GetPlaybackInfo() {
                if let Ok(status) = playback_info.PlaybackStatus() {
                    if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
                        best_session = Some(session);
                        break;
                    }
                }
            }
            if fallback_session.is_none() {
                if let Ok(props_op) = session.TryGetMediaPropertiesAsync() {
                    if let Ok(props) = props_op.join() {
                        if let Ok(title) = props.Title() {
                            if !title.is_empty() {
                                fallback_session = Some(session);
                            }
                        }
                    }
                }
            }
        }
    }

    let session: GlobalSystemMediaTransportControlsSession = match best_session
        .or(fallback_session)
        .or_else(|| manager.GetCurrentSession().ok())
    {
        Some(s) => s,
        None => {
            return Ok(SystemMediaPayload {
                has_media: false,
                ..Default::default()
            });
        }
    };

    let playback_info = session.GetPlaybackInfo()?;
    let status = playback_info.PlaybackStatus()?;
    let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

    let media_props_op = session.TryGetMediaPropertiesAsync()?;
    let media_props = media_props_op.join()?;
    let title = media_props.Title()?.to_string();
    let artist = media_props.Artist()?.to_string();
    let album_title = media_props.AlbumTitle()?.to_string();

    let app_id = session.SourceAppUserModelId()?.to_string();
    let source_app = resolve_source_app(&app_id, &title);

    let (position_secs, duration_secs) = if let Ok(timeline) = session.GetTimelineProperties() {
        let pos = timeline
            .Position()
            .map(|p| (p.Duration / 10_000_000) as u64)
            .unwrap_or(0);
        let start = timeline.StartTime().map(|s| s.Duration).unwrap_or(0);
        let end = timeline.EndTime().map(|e| e.Duration).unwrap_or(0);
        let dur = if end > start {
            ((end - start) / 10_000_000) as u64
        } else {
            0
        };
        (pos, dur)
    } else {
        (0, 0)
    };

    // Extract stream thumbnail if available
    let thumbnail_base64 = (|| -> Option<String> {
        let stream_ref = media_props.Thumbnail().ok()?;
        let stream_op = stream_ref.OpenReadAsync().ok()?;
        let stream = stream_op.join().ok()?;
        let size = stream.Size().ok()?;
        if size == 0 || size > 5 * 1024 * 1024 {
            return None;
        }
        let reader = windows::Storage::Streams::DataReader::CreateDataReader(&stream).ok()?;
        let load_op = reader.LoadAsync(size as u32).ok()?;
        load_op.join().ok()?;
        let mut buffer = vec![0u8; size as usize];
        reader.ReadBytes(&mut buffer).ok()?;

        use base64::Engine;
        let encoded = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let mime = if buffer.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
            "image/png"
        } else {
            "image/jpeg"
        };
        Some(format!("data:{};base64,{}", mime, encoded))
    })();

    let has_media = !title.is_empty() || !artist.is_empty();

    Ok(SystemMediaPayload {
        title,
        artist,
        album_title,
        is_playing,
        position_secs,
        duration_secs,
        source_app,
        thumbnail_base64,
        has_media,
    })
}

/// Helper struct for Window Media Scanning
#[cfg(windows)]
struct WindowMediaScan {
    title: String,
    artist: String,
    source_app: String,
}

#[cfg(windows)]
unsafe extern "system" fn enum_window_callback(
    hwnd: windows_sys::Win32::Foundation::HWND,
    lparam: windows_sys::Win32::Foundation::LPARAM,
) -> windows_sys::Win32::Foundation::BOOL {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetWindowTextLengthW, GetWindowTextW, IsWindowVisible,
    };

    if IsWindowVisible(hwnd) == 0 {
        return 1;
    }

    let len = GetWindowTextLengthW(hwnd);
    if len <= 0 || len > 512 {
        return 1;
    }

    let mut buf = vec![0u16; (len + 1) as usize];
    let read = GetWindowTextW(hwnd, buf.as_mut_ptr(), len + 1);
    if read <= 0 {
        return 1;
    }

    let title_full = String::from_utf16_lossy(&buf[..read as usize]);

    // Check YouTube Music
    if title_full.contains(" - YouTube Music") {
        let mut clean = title_full.replace(" - YouTube Music", "");
        clean = strip_browser_suffix(&clean);
        let (artist, track) = parse_artist_track(&clean, "YouTube Music");
        let result_ptr = lparam as *mut Option<WindowMediaScan>;
        *result_ptr = Some(WindowMediaScan {
            title: track,
            artist,
            source_app: "YouTube Music".to_string(),
        });
        return 0; // Stop enumeration
    }

    // Check YouTube video in browser
    if title_full.contains(" - YouTube") {
        let mut clean = title_full.replace(" - YouTube", "");
        clean = strip_browser_suffix(&clean);
        let (artist, track) = parse_artist_track(&clean, "YouTube");
        let result_ptr = lparam as *mut Option<WindowMediaScan>;
        *result_ptr = Some(WindowMediaScan {
            title: track,
            artist,
            source_app: "YouTube".to_string(),
        });
        return 0; // Stop enumeration
    }

    // Check Spotify client window (Class name: Chrome_WidgetWin_0)
    let mut class_buf = [0u16; 64];
    let class_len = GetClassNameW(hwnd, class_buf.as_mut_ptr(), class_buf.len() as i32);
    if class_len > 0 {
        let class_name = String::from_utf16_lossy(&class_buf[..class_len as usize]);
        if class_name == "Chrome_WidgetWin_0"
            && title_full.contains(" - ")
            && !title_full.starts_with("Spotify")
        {
            let (artist, track) = parse_artist_track(&title_full, "Spotify");
            let result_ptr = lparam as *mut Option<WindowMediaScan>;
            *result_ptr = Some(WindowMediaScan {
                title: track,
                artist,
                source_app: "Spotify".to_string(),
            });
            return 0; // Stop enumeration
        }
    }

    1 // Continue enumeration
}

/// Engine B: Win32 Window Title Fallback
#[cfg(windows)]
fn query_engine_b_window_titles() -> Option<SystemMediaPayload> {
    use windows_sys::Win32::UI::WindowsAndMessaging::EnumWindows;

    let mut scanned: Option<WindowMediaScan> = None;
    unsafe {
        EnumWindows(
            Some(enum_window_callback),
            &mut scanned as *mut Option<WindowMediaScan> as isize,
        );
    }

    scanned.map(|scan| SystemMediaPayload {
        title: scan.title,
        artist: scan.artist,
        album_title: String::new(),
        is_playing: true,
        position_secs: 0,
        duration_secs: 240,
        source_app: scan.source_app,
        thumbnail_base64: None,
        has_media: true,
    })
}

/// Dual-Engine query: Combines Engine A (WinRT SMTC) with Engine B (Win32 Window Title Fallback)
#[cfg(windows)]
pub fn query_system_media() -> Result<SystemMediaPayload, Box<dyn std::error::Error>> {
    // 1. Try Engine A (WinRT SMTC)
    if let Ok(payload) = query_engine_a_smtc() {
        if payload.has_media && !payload.title.is_empty() {
            return Ok(payload);
        }
    }

    // 2. Fallback to Engine B (Win32 Window Title Scanning)
    if let Some(payload) = query_engine_b_window_titles() {
        return Ok(payload);
    }

    Ok(SystemMediaPayload {
        has_media: false,
        ..Default::default()
    })
}

#[cfg(not(windows))]
pub fn query_system_media() -> Result<SystemMediaPayload, Box<dyn std::error::Error>> {
    Ok(SystemMediaPayload {
        has_media: false,
        ..Default::default()
    })
}

/// Spawns a background thread polling media state every 1000ms with CoInitializeEx
pub fn start_media_session_listener(window: Window) {
    if MEDIA_LOOP_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        // Initialize COM for this thread
        #[cfg(windows)]
        unsafe {
            use windows_sys::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
            CoInitializeEx(std::ptr::null(), COINIT_MULTITHREADED as u32);
        }

        let mut last_title = String::new();
        let mut last_playing = false;
        let mut last_pos = 0u64;
        let mut tick_counter = 0u64;

        loop {
            std::thread::sleep(Duration::from_millis(1000));

            #[cfg(windows)]
            if let Ok(mut payload) = query_system_media() {
                // If detected via Engine B (position_secs == 0 && duration_secs == 240), tick position smoothly
                if payload.has_media && payload.thumbnail_base64.is_none() && payload.duration_secs == 240 {
                    if payload.title == last_title && payload.is_playing {
                        tick_counter += 1;
                    } else {
                        tick_counter = 0;
                    }
                    payload.position_secs = tick_counter;
                }

                let changed = payload.title != last_title
                    || payload.is_playing != last_playing
                    || (payload.is_playing && payload.position_secs != last_pos);

                if changed {
                    last_title = payload.title.clone();
                    last_playing = payload.is_playing;
                    last_pos = payload.position_secs;

                    let _ = window.emit("system-media-update", &payload);
                }
            }
        }
    });
}

/// Tauri Command: Toggle Play/Pause on the active Windows media player (SMTC + Virtual Media Key)
#[tauri::command]
pub fn media_play_pause() -> bool {
    #[cfg(windows)]
    {
        // 1. Try WinRT SMTC
        if let Ok(manager_op) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
            if let Ok(manager) = manager_op.join() {
                let session = manager.GetCurrentSession().ok().or_else(|| {
                    manager.GetSessions().ok().and_then(|s| {
                        let mut it = s.into_iter();
                        it.next()
                    })
                });
                if let Some(s) = session {
                    if let Ok(async_op) = s.TryTogglePlayPauseAsync() {
                        let _ = async_op.join();
                    }
                }
            }
        }

        // 2. Fallback: Virtual Media Key event
        unsafe {
            use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                keybd_event, KEYEVENTF_KEYUP, VK_MEDIA_PLAY_PAUSE,
            };
            keybd_event(VK_MEDIA_PLAY_PAUSE as u8, 0, 0, 0);
            keybd_event(VK_MEDIA_PLAY_PAUSE as u8, 0, KEYEVENTF_KEYUP, 0);
        }
        true
    }
    #[cfg(not(windows))]
    false
}

/// Tauri Command: Skip to next track (SMTC + Virtual Media Key)
#[tauri::command]
pub fn media_next_track() -> bool {
    #[cfg(windows)]
    {
        // 1. Try WinRT SMTC
        if let Ok(manager_op) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
            if let Ok(manager) = manager_op.join() {
                if let Ok(session) = manager.GetCurrentSession() {
                    let _ = session.TrySkipNextAsync().and_then(|op| op.join());
                }
            }
        }

        // 2. Fallback: Virtual Media Key event
        unsafe {
            use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                keybd_event, KEYEVENTF_KEYUP, VK_MEDIA_NEXT_TRACK,
            };
            keybd_event(VK_MEDIA_NEXT_TRACK as u8, 0, 0, 0);
            keybd_event(VK_MEDIA_NEXT_TRACK as u8, 0, KEYEVENTF_KEYUP, 0);
        }
        true
    }
    #[cfg(not(windows))]
    false
}

/// Tauri Command: Skip to previous track (SMTC + Virtual Media Key)
#[tauri::command]
pub fn media_prev_track() -> bool {
    #[cfg(windows)]
    {
        // 1. Try WinRT SMTC
        if let Ok(manager_op) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
            if let Ok(manager) = manager_op.join() {
                if let Ok(session) = manager.GetCurrentSession() {
                    let _ = session.TrySkipPreviousAsync().and_then(|op| op.join());
                }
            }
        }

        // 2. Fallback: Virtual Media Key event
        unsafe {
            use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                keybd_event, KEYEVENTF_KEYUP, VK_MEDIA_PREV_TRACK,
            };
            keybd_event(VK_MEDIA_PREV_TRACK as u8, 0, 0, 0);
            keybd_event(VK_MEDIA_PREV_TRACK as u8, 0, KEYEVENTF_KEYUP, 0);
        }
        true
    }
    #[cfg(not(windows))]
    false
}
