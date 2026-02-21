use std::fs;
use std::path::PathBuf;

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
    tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![write_now_playing])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
