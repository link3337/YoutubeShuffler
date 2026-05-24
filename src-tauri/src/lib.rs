use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

#[tauri::command]
fn write_now_playing(title: String, path: Option<String>) -> Result<(), String> {
    // one line, trimmed
    let clean = title.split_whitespace().collect::<Vec<_>>().join(" ");

    let out_path: PathBuf = if let Some(p) = path {
        PathBuf::from(p)
    } else {
        PathBuf::from("current_song.txt")
    };

    fs::write(&out_path, format!("{clean}\n")).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn fetch_ytdlp_playlist_json(
    app: tauri::AppHandle,
    playlist_input: String,
) -> Result<String, String> {
    let trimmed = playlist_input.trim();
    if trimmed.is_empty() {
        return Err("Playlist ID or URL is required.".to_string());
    }

    let source = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://www.youtube.com/playlist?list={trimmed}")
    };

    let ytdlp_path = resolve_ytdlp_path(&app);

    let output = Command::new(&ytdlp_path)
        .args(["--flat-playlist", "-J", &source])
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute yt-dlp at '{}': {}. Install yt-dlp or bundle it with the app.",
                ytdlp_path.display(),
                e
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let message = if stderr.is_empty() {
            format!("yt-dlp failed with status {}", output.status)
        } else {
            stderr
        };
        return Err(message);
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|e| format!("yt-dlp output was not valid UTF-8: {e}"))?;

    if stdout.trim().is_empty() {
        return Err("yt-dlp returned empty output.".to_string());
    }

    Ok(stdout)
}

fn resolve_ytdlp_path(app: &tauri::AppHandle) -> PathBuf {
    if let Ok(custom) = std::env::var("YTDLP_PATH") {
        let custom_path = PathBuf::from(custom);
        if custom_path.exists() {
            return custom_path;
        }
    }

    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            candidates.push(exe_dir.join(platform_ytdlp_binary_name()));
            candidates.push(exe_dir.join("yt-dlp").join(platform_ytdlp_binary_name()));
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(platform_ytdlp_binary_name()));
        candidates.push(
            resource_dir
                .join("yt-dlp")
                .join(platform_ytdlp_binary_name()),
        );
    }

    if let Some(found) = candidates.into_iter().find(|p| p.exists()) {
        return found;
    }

    PathBuf::from(platform_ytdlp_binary_name())
}

fn platform_ytdlp_binary_name() -> &'static Path {
    #[cfg(target_os = "windows")]
    {
        Path::new("yt-dlp.exe")
    }
    #[cfg(not(target_os = "windows"))]
    {
        Path::new("yt-dlp")
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            write_now_playing,
            fetch_ytdlp_playlist_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
