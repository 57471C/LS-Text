use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[tauri::command]
pub async fn open_external_terminal(path: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || open_sync(path))
        .await
        .map_err(|e| e.to_string())?
}

fn open_sync(path: Option<String>) -> Result<String, String> {
    let target = resolve_path(path)?;

    #[cfg(target_os = "windows")]
    {
        return open_windows(&target);
    }

    #[cfg(target_os = "macos")]
    {
        return open_macos(&target);
    }

    #[cfg(target_os = "linux")]
    {
        return open_linux(&target);
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".into())
    }
}

fn resolve_path(path: Option<String>) -> Result<PathBuf, String> {
    if let Some(raw) = path {
        let p = PathBuf::from(&raw);
        if p.is_dir() {
            return Ok(p);
        }
        if let Some(parent) = p.parent() {
            if parent.exists() {
                return Ok(parent.to_path_buf());
            }
        }
    }
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .map_err(|_| "Could not resolve a working directory".into())
}

fn spawn_detached(mut cmd: Command) -> Result<(), String> {
    cmd.stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        cmd.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP);
    }

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        unsafe {
            cmd.pre_exec(|| {
                libc_setsid();
                Ok(())
            });
        }
    }

    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

fn try_spawn(bin: &str, args: &[&str]) -> bool {
    let mut cmd = Command::new(bin);
    cmd.args(args);
    spawn_detached(cmd).is_ok()
}

fn try_unix_path_terms(dir_s: &str) -> Option<String> {
    let cwd = format!("--working-directory={dir_s}");
    if try_spawn("ghostty", &[&cwd]) {
        return Some(format!("ghostty:{dir_s}"));
    }
    if try_spawn("alacritty", &[&cwd]) {
        return Some(format!("alacritty:{dir_s}"));
    }
    if try_spawn("kitty", &["--directory", dir_s]) {
        return Some(format!("kitty:{dir_s}"));
    }
    None
}

#[cfg(unix)]
fn libc_setsid() {
    unsafe {
        libc_syscall_setsid();
    }
}

#[cfg(unix)]
unsafe fn libc_syscall_setsid() {
    extern "C" {
        fn setsid() -> i32;
    }
    let _ = setsid();
}

#[cfg(target_os = "macos")]
fn app_exists(name: &str) -> bool {
    Path::new(&format!("/Applications/{name}.app")).exists()
        || Path::new(&format!("/Applications/{name}.app/Contents/MacOS/{name}")).exists()
}

#[cfg(target_os = "macos")]
fn open_macos(dir: &Path) -> Result<String, String> {
    let dir_s = dir.to_string_lossy().to_string();
    if let Some(hit) = try_unix_path_terms(&dir_s) {
        return Ok(hit);
    }
    let cwd = format!("--working-directory={dir_s}");
    for app in ["Ghostty", "Alacritty", "Kitty"] {
        if !app_exists(app) {
            continue;
        }
        if try_spawn("open", &["-na", app, "--args", &cwd]) {
            return Ok(format!("{app}:{dir_s}"));
        }
    }
    if try_spawn("open", &["-a", "Terminal", &dir_s]) {
        return Ok(format!("Terminal.app:{dir_s}"));
    }
    Err("Could not launch Terminal.app".into())
}

#[cfg(target_os = "linux")]
fn open_linux(dir: &Path) -> Result<String, String> {
    let dir_s = dir.to_string_lossy().to_string();
    if let Some(hit) = try_unix_path_terms(&dir_s) {
        return Ok(hit);
    }
    for candidate in [
        "x-terminal-emulator",
        "sensible-terminal",
        "gnome-terminal",
        "konsole",
        "xfce4-terminal",
    ] {
        let ok = if candidate == "gnome-terminal"
            || candidate == "konsole"
            || candidate == "xfce4-terminal"
        {
            try_spawn(candidate, &["--working-directory", &dir_s])
        } else {
            try_spawn(candidate, &[])
        };
        if ok {
            return Ok(format!("{candidate}:{dir_s}"));
        }
    }
    Err("No terminal emulator found (ghostty / alacritty / kitty / x-terminal-emulator)".into())
}

#[cfg(target_os = "windows")]
fn open_windows(dir: &Path) -> Result<String, String> {
    let dir_s = dir.to_string_lossy().to_string();
    let cwd = format!("--working-directory={dir_s}");

    if try_spawn("ghostty", &[&cwd]) || try_spawn("ghostty.exe", &[&cwd]) {
        return Ok(format!("ghostty:{dir_s}"));
    }

    if try_spawn("cmd", &["/C", "start", "", "wt.exe", "-d", &dir_s])
        || try_spawn("wt.exe", &["-d", &dir_s])
        || try_spawn("wt", &["-d", &dir_s])
    {
        return Ok(format!("wt:{dir_s}"));
    }

    let cd = format!("Set-Location '{}'", dir_s.replace('\'', "''"));
    if try_spawn("cmd", &["/C", "start", "", "powershell.exe", "-NoExit", "-Command", &cd])
        || try_spawn("powershell.exe", &["-NoExit", "-Command", &cd])
    {
        return Ok(format!("powershell:{dir_s}"));
    }

    Err("Could not launch Windows Terminal or PowerShell".into())
}
