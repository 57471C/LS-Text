use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }
    let mut entries: Vec<DirEntry> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
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
