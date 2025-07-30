#[tauri::command]
fn extract_zip(zip_path: String, dest_dir: String) -> Result<(), String> {
    use std::fs::{create_dir_all, File};
    use std::io::BufReader;
    use std::path::Path;
    use zip::ZipArchive;

    let file = File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(BufReader::new(file)).map_err(|e| e.to_string())?;
    create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = Path::new(&dest_dir).join(file.name());
        if file.is_dir() {
            create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                create_dir_all(p).map_err(|e| e.to_string())?;
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn launch_game(jre_path: String, classpath: Vec<String>, java_args: Vec<String>, game_args: Vec<String>) -> Result<(), String> {
    use std::process::Command;
    use std::path::{Path};

    // Determine the java command path
    let java_cmd = if jre_path.trim().is_empty() {
        "java".to_string()
    } else {
        let path = Path::new(&jre_path);
        let last = path.file_name().and_then(|n| n.to_str());
        if last == Some("bin") {
            path.join("java").to_string_lossy().to_string()
        } else {
            path.join("bin/java").to_string_lossy().to_string()
        }
    };

    let mut args = java_args;
    args.push("-cp".to_string());
    args.push(classpath.join(":"));
    args.push("world.selene.client.ClientBootstrapKt".to_string());
    args.extend(game_args);
    println!("Launching game with args: {}", args.join(" "));
    Command::new(java_cmd)
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to launch game: {}", e))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build());
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
            // when defining deep link schemes at runtime, you must also check `argv` here
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
                println!("Deep link registered");
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![extract_zip, launch_game,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
