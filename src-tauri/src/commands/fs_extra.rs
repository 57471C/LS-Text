use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

fn list_dir_inner(path: &str) -> Result<Vec<DirEntry>, String> {
    let dir = PathBuf::from(path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }
    let mut entries: Vec<DirEntry> = fs::read_dir(&dir)
        .map_err(|e| format!("{e}: {path}"))?
        .filter_map(|res| res.ok())
        .map(|e| {
            let path = e.path();
            DirEntry {
                name: e.file_name().to_string_lossy().into_owned(),
                path: path.to_string_lossy().into_owned(),
                is_dir: path.is_dir(),
            }
        })
        .collect();

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let (tx, rx) = mpsc::channel();
    let probe = path.clone();
    thread::spawn(move || {
<<<<<<< HEAD
        let _ = tx.send(list_dir_inner(&probe));
    });
    match rx.recv_timeout(Duration::from_secs(4)) {
=======
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            list_dir_inner(&probe)
        }));
        let _ = tx.send(match result {
            Ok(r) => r,
            Err(_) => Err(format!("Failed to list folder (panic): {path}")),
        });
    });
    match rx.recv_timeout(Duration::from_secs(1)) {
>>>>>>> 8d2362a (fix network path crash issue)
        Ok(result) => result,
        Err(_) => Err(format!(
            "Folder not available. The network drive may be disconnected: {path}"
        )),
    }
}

#[tauri::command]
pub fn read_text(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("{e}: {path}"))
}

#[tauri::command]
pub fn write_text(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&path, contents).map_err(|e| format!("{e}: {path}"))
}
