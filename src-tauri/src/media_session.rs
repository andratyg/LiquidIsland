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

/// Queries current SMTC media state on Windows
#[cfg(windows)]
pub fn query_system_media() -> Result<SystemMediaPayload, Box<dyn std::error::Error>> {
    let manager_op = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?;
    let manager = manager_op.join()?;

    let session: GlobalSystemMediaTransportControlsSession = match manager.GetCurrentSession() {
        Ok(s) => s,
        Err(_) => {
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
        let pos = timeline.Position().map(|p| (p.Duration / 10_000_000) as u64).unwrap_or(0);
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

    let has_media = !title.is_empty() || !artist.is_empty();

    Ok(SystemMediaPayload {
        title,
        artist,
        album_title,
        is_playing,
        position_secs,
        duration_secs,
        source_app,
        thumbnail_base64: None,
        has_media,
    })
}

#[cfg(not(windows))]
pub fn query_system_media() -> Result<SystemMediaPayload, Box<dyn std::error::Error>> {
    Ok(SystemMediaPayload {
        has_media: false,
        ..Default::default()
    })
}

/// Spawns a background thread polling SMTC every 1000ms and emitting "system-media-update" to React
pub fn start_media_session_listener(window: Window) {
    if MEDIA_LOOP_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        let mut last_title = String::new();
        let mut last_playing = false;
        let mut last_pos = 0u64;

        loop {
            std::thread::sleep(Duration::from_millis(1000));

            #[cfg(windows)]
            if let Ok(payload) = query_system_media() {
                // Emit if track changed, playback toggled, or playing position advanced
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

/// Tauri Command: Toggle Play/Pause on the active Windows media player (Spotify, YouTube, etc.)
#[tauri::command]
pub fn media_play_pause() -> bool {
    #[cfg(windows)]
    {
        if let Ok(manager_op) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
            if let Ok(manager) = manager_op.join() {
                if let Ok(session) = manager.GetCurrentSession() {
                    if let Ok(async_op) = session.TryTogglePlayPauseAsync() {
                        return async_op.join().unwrap_or(false);
                    }
                }
            }
        }
    }
    false
}

/// Tauri Command: Skip to next track on the active Windows media player
#[tauri::command]
pub fn media_next_track() -> bool {
    #[cfg(windows)]
    {
        if let Ok(manager_op) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
            if let Ok(manager) = manager_op.join() {
                if let Ok(session) = manager.GetCurrentSession() {
                    if let Ok(async_op) = session.TrySkipNextAsync() {
                        return async_op.join().unwrap_or(false);
                    }
                }
            }
        }
    }
    false
}

/// Tauri Command: Skip to previous track on the active Windows media player
#[tauri::command]
pub fn media_prev_track() -> bool {
    #[cfg(windows)]
    {
        if let Ok(manager_op) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
            if let Ok(manager) = manager_op.join() {
                if let Ok(session) = manager.GetCurrentSession() {
                    if let Ok(async_op) = session.TrySkipPreviousAsync() {
                        return async_op.join().unwrap_or(false);
                    }
                }
            }
        }
    }
    false
}
