use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[tauri::command]
pub fn open_external_terminal(path: Option<String>) -> Result<String, String> {
    let target = resolve_path(path)?;

    #[cfg(target_os = "windows")]
    {
        return open_windows(&target);
    }

    #[cfg(target_os = "macos")]
    {
        return open_unix(&target, true);
    }

    #[cfg(target_os = "linux")]
    {
        return open_unix(&target, false);
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

fn on_path(bin: &str) -> bool {
    #[cfg(windows)]
    {
        Command::new("where")
            .arg(bin)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
    #[cfg(not(windows))]
    {
        Command::new("which")
            .arg(bin)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
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
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW);
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

#[cfg(unix)]
fn libc_setsid() {
    unsafe {
        libc_syscall_setsid();
    }
}

#[cfg(unix)]
unsafe fn libc_syscall_setsid() {
    // Avoid a libc crate dep: call setsid via the libc symbol if linked by std.
    extern "C" {
        fn setsid() -> i32;
    }
    let _ = setsid();
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn open_unix(dir: &Path, macos: bool) -> Result<String, String> {
    let dir_s = dir.to_string_lossy().to_string();

    if on_path("ghostty") {
        let mut cmd = Command::new("ghostty");
        cmd.arg("--working-directory").arg(&dir_s);
        spawn_detached(cmd)?;
        return Ok(format!("ghostty:{dir_s}"));
    }
    if on_path("alacritty") {
        let mut cmd = Command::new("alacritty");
        cmd.arg("--working-directory").arg(&dir_s);
        spawn_detached(cmd)?;
        return Ok(format!("alacritty:{dir_s}"));
    }
    if on_path("kitty") {
        let mut cmd = Command::new("kitty");
        cmd.arg("--directory").arg(&dir_s);
        spawn_detached(cmd)?;
        return Ok(format!("kitty:{dir_s}"));
    }

    if macos {
        for app in ["Ghostty", "Alacritty", "Kitty"] {
            let mut probe = Command::new("open");
            probe.arg("-Ra").arg(app);
            if probe
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
            {
                let mut cmd = Command::new("open");
                cmd.arg("-na")
                    .arg(app)
                    .arg("--args")
                    .arg("--working-directory")
                    .arg(&dir_s);
                spawn_detached(cmd)?;
                return Ok(format!("{app}:{dir_s}"));
            }
        }
        let mut cmd = Command::new("open");
        cmd.arg("-a").arg("Terminal").arg(&dir_s);
        spawn_detached(cmd)?;
        return Ok(format!("Terminal.app:{dir_s}"));
    }

    for candidate in ["x-terminal-emulator", "sensible-terminal", "gnome-terminal", "konsole", "xfce4-terminal"] {
        if on_path(candidate) {
            let mut cmd = Command::new(candidate);
            if candidate == "gnome-terminal" {
                cmd.arg("--working-directory").arg(&dir_s);
            } else if candidate == "konsole" || candidate == "xfce4-terminal" {
                cmd.arg("--working-directory").arg(&dir_s);
            }
            spawn_detached(cmd)?;
            return Ok(format!("{candidate}:{dir_s}"));
        }
    }

    Err("No terminal emulator found (ghostty / alacritty / kitty / x-terminal-emulator)".into())
}

#[cfg(target_os = "windows")]
fn open_windows(dir: &Path) -> Result<String, String> {
    let dir_s = dir.to_string_lossy().to_string();

    if on_path("ghostty.exe") || on_path("ghostty") {
        let mut cmd = Command::new("ghostty");
        cmd.arg("--working-directory").arg(&dir_s);
        spawn_detached(cmd)?;
        return Ok(format!("ghostty:{dir_s}"));
    }

    if on_path("wt.exe") || on_path("wt") {
        let mut cmd = Command::new("wt.exe");
        cmd.arg("-d").arg(&dir_s);
        spawn_detached(cmd)?;
        return Ok(format!("wt:{dir_s}"));
    }

    let mut cmd = Command::new("powershell.exe");
    cmd.arg("-NoExit")
        .arg("-Command")
        .arg(format!("Set-Location '{}'", dir_s.replace('\'', "''")));
    spawn_detached(cmd)?;
    Ok(format!("powershell:{dir_s}"))
}
