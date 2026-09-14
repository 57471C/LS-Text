use std::path::{Path, PathBuf};

#[tauri::command]
pub fn launch_paths() -> Vec<String> {
    collect_open_paths(std::env::args().skip(1))
}

pub fn collect_open_paths(args: impl IntoIterator<Item = String>) -> Vec<String> {
    args.into_iter().filter_map(|raw| normalize_open_arg(&raw)).collect()
}

fn normalize_open_arg(raw: &str) -> Option<String> {
    let trimmed = raw.trim().trim_matches('"');
    if trimmed.is_empty() || trimmed.starts_with('-') {
        return None;
    }
    let path = if let Some(rest) = strip_file_url(trimmed) {
        PathBuf::from(rest)
    } else {
        PathBuf::from(trimmed)
    };
    if path.is_file() {
        Some(path.to_string_lossy().into_owned())
    } else {
        None
    }
}

fn strip_file_url(raw: &str) -> Option<String> {
    let lower = raw.to_ascii_lowercase();
    if !lower.starts_with("file:") {
        return None;
    }
    let rest = raw.splitn(2, ':').nth(1)?;
    let rest = rest.trim_start_matches('/');
    let rest = rest.strip_prefix("localhost/").unwrap_or(rest);
    let decoded = percent_decode(rest);
    #[cfg(windows)]
    {
        Some(decoded.replace('/', "\\"))
    }
    #[cfg(not(windows))]
    {
        Some(if decoded.starts_with('/') {
            decoded
        } else {
            format!("/{decoded}")
        })
    }
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (from_hex(bytes[i + 1]), from_hex(bytes[i + 2])) {
                out.push((h << 4) | l);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn from_hex(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

#[allow(dead_code)]
fn _is_path(p: &Path) -> bool {
    p.exists()
}
