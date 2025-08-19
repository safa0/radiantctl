# Radiant Control

A modern desktop application for controlling monitor brightness, contrast, and other display settings on Linux systems using DDC/CI protocol.

![Radiant Control](https://img.shields.io/badge/Version-0.1.0-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Linux-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- **Multi-Monitor Support**: Control multiple displays simultaneously
- **Brightness & Contrast Control**: Adjust monitor brightness and contrast with real-time sliders
- **Quick Presets**: Pre-configured settings for different use cases
- **Advanced VCP Settings**: Direct access to Virtual Control Panel codes
- **Modern UI**: Clean, intuitive interface built with React and Tauri
- **AppImage Distribution**: Easy installation and updates

## Screenshots

*Screenshots will be added here*

## Installation

### AppImage (Recommended)

1. Download the latest AppImage from the [Releases](https://github.com/safa0/radiantctl/releases) page
2. Make it executable:
   ```bash
   chmod +x radiantctl_0.1.0_amd64.AppImage
   ```
3. Run the application:
   ```bash
   ./radiantctl_0.1.0_amd64.AppImage
   ```

### Debian/Ubuntu (.deb)

1. Download the `.deb` file from the [Releases](https://github.com/safa0/radiantctl/releases) page
2. Install using:
   ```bash
   sudo dpkg -i radiantctl_0.1.0_amd64.deb
   ```

### RPM-based (.rpm)

1. Download the `.rpm` file from the [Releases](https://github.com/safa0/radiantctl/releases) page
2. Install using:
   ```bash
   sudo rpm -i radiantctl-0.1.0-1.x86_64.rpm
   ```

## Prerequisites

### System Requirements

- Linux distribution with GTK3 support
- Kernel with I2C support
- User permissions for I2C devices

### Required Software

Install `ddcutil` for DDC/CI communication:

```bash
# Ubuntu/Debian
sudo apt install ddcutil

# Fedora
sudo dnf install ddcutil

# Arch Linux
sudo pacman -S ddcutil
```

### I2C Setup

Enable I2C support and set up permissions:

```bash
# Load I2C kernel module
sudo modprobe i2c-dev

# Make I2C module load at boot
echo 'i2c-dev' | sudo tee /etc/modules-load.d/i2c-dev.conf

# Create udev rules for I2C access
echo 'KERNEL=="i2c-*", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/60-ddcutil.rules

# Reload udev rules
sudo udevadm control --reload-rules && sudo udevadm trigger

# Add your user to the i2c group
sudo usermod -aG i2c $USER

# Re-login for group changes to take effect
```

## Usage

### Basic Operation

1. Launch Radiant Control
2. Select a monitor from the sidebar
3. Use the brightness and contrast sliders to adjust settings
4. Apply quick presets for common scenarios

### Advanced Features

- **VCP Codes**: Access advanced monitor controls using Virtual Control Panel codes
- **Preset Management**: Create and manage custom presets for different use cases
- **Multi-Monitor**: Control multiple displays independently

### Troubleshooting

#### No Monitors Detected

1. Ensure `ddcutil` is installed and working:
   ```bash
   ddcutil detect
   ```

2. Check I2C permissions:
   ```bash
   groups $USER
   ```
   Your user should be in the `i2c` group.

3. Verify I2C devices are accessible:
   ```bash
   ls -la /dev/i2c-*
   ```

#### Permission Denied Errors

1. Re-login after adding user to i2c group
2. Check udev rules are properly configured
3. Ensure kernel module is loaded:
   ```bash
   lsmod | grep i2c
   ```

## Development

### Prerequisites

- Node.js 18+
- Rust (latest stable)
- System dependencies (see GitHub Actions workflow)

### Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/safa0/radiantctl.git
   cd radiantctl
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run tauri build
   ```

4. Run in development mode:
   ```bash
   npm run tauri dev
   ```

### Project Structure

```
radiantctl/
├── src/                 # React frontend
│   ├── App.tsx         # Main application component
│   └── lib/
│       └── presets.ts  # Monitor presets
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── main.rs     # Application entry point
│   │   └── lib.rs      # Core functionality
│   └── tauri.conf.json # Tauri configuration
└── package.json        # Node.js dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop application framework
- [ddcutil](https://www.ddcutil.com/) - DDC/CI communication library
- [React](https://reactjs.org/) - UI framework

## Support

- **Issues**: [GitHub Issues](https://github.com/safa0/radiantctl/issues)
- **Discussions**: [GitHub Discussions](https://github.com/safa0/radiantctl/discussions)
- **Documentation**: [Wiki](https://github.com/safa0/radiantctl/wiki)

---

