#!/bin/bash

# Release script for radiantctl
# This script creates a GitHub release with the AppImage

set -e

# Configuration
APP_NAME="radiantctl"
VERSION="0.2.0"
REPO="safa0/radiantctl"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Creating release for ${APP_NAME} v${VERSION}${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed. Please install it first:${NC}"
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}You are not authenticated with GitHub CLI. Please run:${NC}"
    echo "gh auth login"
    exit 1
fi

# Build the application
echo -e "${YELLOW}Building application...${NC}"
npm run tauri build

# Create release notes
RELEASE_NOTES="## What's New in v${VERSION} - Smart Preset System! 🎨

### 🌟 Major New Features

#### Smart Preset Management
- **🎯 Intelligent Visual Feedback**: Checkmarks (✓) when values match presets exactly
- **🎨 Enhanced Visual States**: Blue for selected, green for matching, orange for modified
- **⚡ Real-time Auto-saving**: Custom presets save changes automatically
- **⚠️ Smart Modification Warnings**: Clear feedback when modifying built-in presets

#### Professional Preset Tools
- **➕ Create Custom Presets**: Dedicated modal with current value detection
- **📋 Duplicate Any Preset**: Copy built-in or custom presets instantly
- **🗑️ Safe Deletion**: Confirmation dialogs for custom preset removal
- **📊 Value Previews**: See brightness/contrast percentages in preset cards

#### Enhanced User Experience
- **🎪 Taller Preset Cards**: Better information layout and visual hierarchy
- **✨ Smooth Animations**: Pulse effects for modified presets and glowing highlights
- **💡 Helpful Status Messages**: Clear guidance for all preset operations
- **🎛️ Professional UI**: Modern styling with proper spacing and typography

### 🔧 Technical Improvements
- **⚡ Optimized State Management**: Better React hooks and performance
- **💾 Persistent Storage**: Custom presets saved to localStorage
- **🔄 Real-time Synchronization**: Instant UI updates when values change
- **🛡️ Type Safety**: Full TypeScript coverage for all new features

### Installation
1. Download the AppImage file
2. Make it executable: \`chmod +x radiantctl_${VERSION}_amd64.AppImage\`
3. Run: \`./radiantctl_${VERSION}_amd64.AppImage\`

### Requirements
- Linux with ddcutil support
- I2C permissions enabled
- GTK3 runtime

### Setup Instructions
\`\`\`bash
# Install ddcutil
sudo apt install ddcutil

# Enable I2C
sudo modprobe i2c-dev
echo 'i2c-dev' | sudo tee /etc/modules-load.d/i2c-dev.conf

# Set up udev rules
echo 'KERNEL==\"i2c-*\", TAG+=\"uaccess\"' | sudo tee /etc/udev/rules.d/60-ddcutil.rules
sudo udevadm control --reload-rules && sudo udevadm trigger

# Add user to i2c group
sudo usermod -aG i2c \$USER

# Re-login for group changes to take effect
\`\`\`

### Known Issues
- Requires proper I2C permissions to control monitors
- Some monitors may not support all VCP codes

### Support
If you encounter issues, please report them on GitHub."

# Create the release
echo -e "${YELLOW}Creating GitHub release...${NC}"
gh release create "v${VERSION}" \
    --title "Release v${VERSION}" \
    --notes "$RELEASE_NOTES" \
    --repo "$REPO" \
    "src-tauri/target/release/bundle/appimage/radiantctl_${VERSION}_amd64.AppImage" \
    "src-tauri/target/release/bundle/deb/radiantctl_${VERSION}_amd64.deb" \
    "src-tauri/target/release/bundle/rpm/radiantctl-${VERSION}-1.x86_64.rpm"

echo -e "${GREEN}Release created successfully!${NC}"
echo -e "${YELLOW}Release URL:${NC} https://github.com/${REPO}/releases/tag/v${VERSION}"
