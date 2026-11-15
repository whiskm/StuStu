// Не открывать рядом с приложением чёрное окно консоли Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    stustu_lib::run()
}
