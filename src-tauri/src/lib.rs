#[tauri::command]
async fn extract_file(file_path: String, dest_dir: String) -> Result<String, String> {
    // Use extract_zip or extract_tar based on file extension
    let file_extension = file_path.split('.').last().unwrap_or_default();
    match file_extension {
        "zip" => extract_zip(file_path, dest_dir).await,
        "gz" => extract_tar(file_path, dest_dir).await,
        "tar" => extract_tar(file_path, dest_dir).await,
        _ => Err(format!("Unsupported file extension: {}", file_extension)),
    }    
}

#[tauri::command]
async fn extract_zip(zip_path: String, dest_dir: String) -> Result<String, String> {
    use std::fs::{create_dir_all, File};
    use std::io::BufReader;
    use std::path::{Path, PathBuf};
    use zip::ZipArchive;
    use std::collections::HashSet;

    let file = File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(BufReader::new(file)).map_err(|e| e.to_string())?;
    create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let mut root_entries: HashSet<PathBuf> = HashSet::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = Path::new(&dest_dir).join(file.name());
        if let Some(first) = Path::new(file.name()).components().next() {
            let mut root = PathBuf::new();
            root.push(first);
            root_entries.insert(root);
        }
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
    // Return the root folder if exactly one, otherwise dest_dir
    if root_entries.len() == 1 {
        if let Some(root) = root_entries.iter().next() {
            Ok(root.to_string_lossy().to_string())
        } else {
            Ok(dest_dir.to_string())
        }
    } else {
        Ok(dest_dir.to_string())
    }
}

#[tauri::command]
async fn extract_tar(tar_path: String, dest_dir: String) -> Result<String, String> {
    use std::fs::{create_dir_all, File};
    use std::io::BufReader;
    use std::path::{Path, PathBuf};
    use tar::Archive;
    use flate2::read::GzDecoder;
    use std::collections::HashSet;

    let tar_path = Path::new(&tar_path);
    let dest_dir = Path::new(&dest_dir);
    create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let file = File::open(&tar_path).map_err(|e| e.to_string())?;
    let ext = tar_path.extension().and_then(|s| s.to_str()).unwrap_or("");
    let mut root_entries: HashSet<PathBuf> = HashSet::new();

    if ext == "gz" {
        // .tar.gz
        let decompressor = GzDecoder::new(BufReader::new(file));
        let mut archive = Archive::new(decompressor);
        for entry in archive.entries().map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if let Ok(path) = entry.path() {
                if let Some(first) = path.components().next() {
                    let mut root = PathBuf::new();
                    root.push(first);
                    root_entries.insert(root);
                }
            }
        }
        // Actually extract
        let file = File::open(&tar_path).map_err(|e| e.to_string())?;
        let decompressor = GzDecoder::new(BufReader::new(file));
        let mut archive = Archive::new(decompressor);
        archive.unpack(&dest_dir).map_err(|e| e.to_string())?;
    } else {
        // .tar
        let mut archive = Archive::new(BufReader::new(file));
        for entry in archive.entries().map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if let Ok(path) = entry.path() {
                if let Some(first) = path.components().next() {
                    let mut root = PathBuf::new();
                    root.push(first);
                    root_entries.insert(root);
                }
            }
        }
        // Actually extract
        let file = File::open(&tar_path).map_err(|e| e.to_string())?;
        let mut archive = Archive::new(BufReader::new(file));
        archive.unpack(&dest_dir).map_err(|e| e.to_string())?;
    }
    if let Some(root) = root_entries.iter().next() {
        Ok(root.to_string_lossy().to_string())
    } else {
        Ok(String::from(""))
    }
}

#[tauri::command]
fn launch_game(
    jre_path: String,
    classpath: Vec<String>,
    java_args: Vec<String>,
    game_args: Vec<String>,
    working_dir: String,
) -> Result<(), String> {
    use std::path::Path;
    use std::process::Command;

    // Determine the java command path
    let java_cmd = if jre_path.trim().is_empty() {
        "java".to_string()
    } else {
        let path = Path::new(&jre_path);
        let last = path.file_name().and_then(|n| n.to_str());
        if last == Some("bin") {
            path.join("java").to_string_lossy().to_string()
        } else if last == Some("java") || last == Some("java.exe") {
            path.to_string_lossy().to_string()
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
        .current_dir(working_dir)
        .spawn()
        .map_err(|e| format!("Failed to launch game: {}", e))?;
    Ok(())
}

#[tauri::command]
fn find_java_path() -> Option<String> {
    use std::env;
    use std::path::Path;
    use std::process::Command;
    #[cfg(target_os = "windows")]
    let is_windows = true;
    #[cfg(not(target_os = "windows"))]
    let is_windows = false;

    // 1. JAVA_HOME
    if let Ok(java_home) = env::var("JAVA_HOME") {
        let java_path = if is_windows {
            Path::new(&java_home).join("bin/java.exe")
        } else {
            Path::new(&java_home).join("bin/java")
        };
        if java_path.exists() {
            let output = if is_windows {
                Command::new("cmd")
                    .args(["/C", &format!("\"{}\" -version", java_path.display())])
                    .output()
            } else {
                Command::new(java_path.to_str().unwrap())
                    .arg("-version")
                    .output()
            };
            if let Ok(output) = output {
                if output.status.success() {
                    return Some(java_path.to_string_lossy().to_string());
                }
            }
        }
    }

    // 2. PATH
    let which_cmd = if is_windows { "where" } else { "which" };
    let java_cmd = if is_windows { "java.exe" } else { "java" };
    let output = if is_windows {
        Command::new("cmd")
            .args(["/C", which_cmd, java_cmd])
            .output()
    } else {
        Command::new(which_cmd).arg(java_cmd).output()
    };
    if let Ok(output) = output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let java_path = stdout.lines().next().unwrap_or("");
            if !java_path.is_empty() {
                let version_output = if is_windows {
                    Command::new("cmd")
                        .args(["/C", &format!("\"{}\" -version", java_path)])
                        .output()
                } else {
                    Command::new(java_path).arg("-version").output()
                };
                if let Ok(vo) = version_output {
                    if vo.status.success() {
                        return Some(java_path.to_string());
                    }
                }
            }
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_upload::init())
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
        .invoke_handler(tauri::generate_handler![
            extract_file,
            extract_zip,
            extract_tar,
            launch_game,
            find_java_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
