use std::fs;
use std::path::PathBuf;
use tauri::Emitter;
use tauri_plugin_global_shortcut::{Code, Shortcut, ShortcutState};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let global_shortcuts = tauri_plugin_global_shortcut::Builder::new()
        .with_shortcuts([
            Shortcut::new(None, Code::MediaTrackNext),
            Shortcut::new(None, Code::MediaTrackPrevious),
            Shortcut::new(None, Code::MediaPlayPause),
        ])
        .expect("failed to configure global shortcuts")
        .with_handler(|app, shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            let emit_result = match shortcut.key {
                Code::MediaTrackNext => app.emit("global-media-next", ()),
                Code::MediaTrackPrevious => app.emit("global-media-previous", ()),
                Code::MediaPlayPause => app.emit("global-media-play-pause", ()),
                _ => Ok(()),
            };

            if let Err(error) = emit_result {
                eprintln!("failed to emit global media shortcut event: {error}");
            }
        })
        .build();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(global_shortcuts)
        .invoke_handler(tauri::generate_handler![write_now_playing])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
