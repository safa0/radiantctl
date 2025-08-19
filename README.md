# Radiant Control

A modern desktop application for controlling monitor brightness, contrast, and other display settings using DDC/CI protocol.

## Features

- **Smart Preset System**: Select and modify presets with intelligent visual feedback
- **Real-time Display Control**: Adjust brightness and contrast with live preview
- **Multi-Monitor Support**: Control multiple displays independently
- **Custom Presets**: Create and save your own preset configurations
- **Automatic Saving**: Changes to custom presets are saved automatically

## Smart Preset Features

The application includes an intelligent preset system that makes it easy to manage and modify display settings:

### Visual Indicators
- **Checkmark (✓)**: Shows when current display values match a preset exactly
- **Selected State**: Blue border and glow when a preset is actively selected
- **Modified State**: Orange border when a selected preset's values have been changed
- **Custom Badge**: Purple badge on custom presets to distinguish them from built-in ones

### How to Use Presets
1. **Select a Preset**: Click on any preset to select it and apply its values
2. **Create New Presets**: Click the "+ Create Preset" button to make custom presets
3. **Modify Values**: With a preset selected, adjust brightness/contrast sliders
4. **Smart Modification Handling**: 
   - Built-in presets: Get a warning banner with options to revert or save as custom
   - Custom presets: Changes are saved automatically in real-time
5. **Preset Management**: 
   - **Duplicate**: Copy any preset (📋 icon)
   - **Delete**: Remove custom presets (🗑️ icon)
   - **Preview**: See brightness/contrast values in each preset card

### Built-in Presets
- **Brightest**: Maximum brightness (100) with high contrast (75)
- **Mid**: Balanced settings (50/50)
- **Midnight**: Low brightness (10) with moderate contrast (40)

## Installation

### Prerequisites
- Linux with ddcutil support
- I2C permissions enabled

### Setup Commands
```bash
# Install ddcutil
sudo apt install ddcutil

# Enable I2C
sudo modprobe i2c-dev
echo 'i2c-dev' | sudo tee /etc/modules-load.d/i2c-dev.conf

# Set up udev rules
echo 'KERNEL=="i2c-*", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/60-ddcutil.rules
sudo udevadm control --reload-rules && sudo udevadm trigger

# Add user to i2c group
sudo usermod -aG i2c $USER

# Re-login for group changes to take effect
```

### Build and Run
```bash
# Install dependencies
npm install

# Development
npm run tauri dev

# Build
npm run tauri build
```

## Development

This project uses:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Display Control**: ddcutil

### Project Structure
- `src/`: React frontend code
- `src-tauri/`: Rust backend code
- `src/lib/presets.ts`: Preset management system
- `src/App.tsx`: Main application component

## License

MIT License - see LICENSE file for details.

