mod commands;

use commands::fs_extra::list_dir;
use commands::launch::{collect_open_paths, launch_paths};
use commands::terminal::open_external_terminal;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let paths = collect_open_paths(argv);
            let _ = app.emit("open-files", &paths);
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            open_external_terminal,
            list_dir,
            launch_paths
        ])
        .run(tauri::generate_context!())
        .expect("error while running LS-Text");
}
