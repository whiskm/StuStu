//! Оболочка StuStu для Windows.
//!
//! Само приложение — тот же интерфейс, что на сайте и в Android. Здесь только то,
//! что нужно программе на компьютере: одно окно на один запуск и сохранение
//! файлов (резервная копия, расписание, календарь) через системное окно «Сохранить как».

use std::path::PathBuf;

use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// «Сохранить как…». Место на диске выбирает пользователь в системном окне,
/// поэтому веб-часть никогда не называет путь сама.
/// Возвращает false, если пользователь закрыл окно без сохранения.
#[tauri::command]
async fn save_file(app: AppHandle, name: String, contents: String) -> Result<bool, String> {
    let file_name = PathBuf::from(&name)
        .file_name()
        .and_then(|n| n.to_str())
        .map(str::to_owned)
        .ok_or("invalid file name")?;
    let ext = PathBuf::from(&file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("txt")
        .to_owned();
    let start = app.path().document_dir().ok().filter(|d| d.is_dir());

    let mut dialog = app
        .dialog()
        .file()
        .set_file_name(&file_name)
        .add_filter(ext.to_uppercase(), &[ext.as_str()]);
    if let Some(dir) = start {
        dialog = dialog.set_directory(dir);
    }
    let Some(chosen) = dialog.blocking_save_file() else {
        return Ok(false);
    };
    let path = chosen.into_path().map_err(|e| e.to_string())?;
    std::fs::write(path, contents).map_err(|e| e.to_string())?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Должен идти первым: повторный запуск показывает уже открытое окно.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app)
        }));
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_file])
        .setup(|app| {
            // Окно создаётся скрытым и показывается уже готовым, без белой вспышки.
            show_main(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the app");
}
