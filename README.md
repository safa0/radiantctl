# radiantctl (Tauri)

Modern, fast DDC/CI monitor manager for Linux, inspired by ddcui.

## Prerequisites (Linux)

- Install Rust toolchain: `https://www.rust-lang.org/learn/get-started#installing-rust`
- Install system deps: Tauri Linux prerequisites: `https://tauri.app/guides/prerequisites/#linux`
- Install `ddcutil` and ensure user has I2C access:
  - `sudo apt install ddcutil`
  - udev rule: `sudo tee /etc/udev/rules.d/60-ddcutil.rules <<<'KERNEL=="i2c-*", TAG+="uaccess"' && sudo udevadm control --reload-rules && sudo udevadm trigger`
  - group: `sudo usermod -aG i2c $USER` then re-login

## Development

```bash
npm install
npm run tauri dev
```

## Build (AppImage)

```bash
npm run build
npm run tauri build
```

## Config location

Settings and presets are stored under `~/.config/radiantctl/settings.json`.

## Backend API

- list_displays(): DisplayInfo[]
- get_display_state(id): DisplayState
- set_vcp_value(id, code, value)
- apply_preset(target, presetId|spec)
- get_settings()/save_settings()
- check_permissions()

Events: displayAdded, displayUpdated.
