#!/bin/bash

# Radiant Control Installation Script
# This script downloads and installs the latest Radiant Control AppImage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="safa0/radiantctl"
APP_NAME="radiantctl"
INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"

echo -e "${BLUE}=== Radiant Control Installer ===${NC}"
echo

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed. Please install curl first.${NC}"
    exit 1
fi

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Will download latest release without version checking.${NC}"
    echo "To install jq: sudo apt install jq (Ubuntu/Debian) or sudo dnf install jq (Fedora)"
    echo
fi

# Create installation directories
echo -e "${YELLOW}Creating installation directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DESKTOP_DIR"

# Get latest release info
echo -e "${YELLOW}Fetching latest release information...${NC}"
if command -v jq &> /dev/null; then
    LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | jq -r '.tag_name')
    if [ "$LATEST_TAG" = "null" ] || [ -z "$LATEST_TAG" ]; then
        echo -e "${RED}Error: Could not fetch latest release information.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Latest version: $LATEST_TAG${NC}"
else
    LATEST_TAG="latest"
    echo -e "${YELLOW}Using latest release (version info unavailable)${NC}"
fi

# Download AppImage
APPIMAGE_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/radiantctl_0.1.0_amd64.AppImage"
APPIMAGE_PATH="$INSTALL_DIR/radiantctl.AppImage"

echo -e "${YELLOW}Downloading Radiant Control AppImage...${NC}"
if curl -L -o "$APPIMAGE_PATH" "$APPIMAGE_URL"; then
    echo -e "${GREEN}Download completed successfully!${NC}"
else
    echo -e "${RED}Error: Failed to download AppImage.${NC}"
    echo "Please check your internet connection and try again."
    exit 1
fi

# Make AppImage executable
chmod +x "$APPIMAGE_PATH"

# Create desktop entry
echo -e "${YELLOW}Creating desktop entry...${NC}"
cat > "$DESKTOP_DIR/radiantctl.desktop" << EOF
[Desktop Entry]
Name=Radiant Control
Comment=Monitor brightness and contrast control
Exec=$APPIMAGE_PATH
Icon=radiantctl
Terminal=false
Type=Application
Categories=System;Settings;
Keywords=monitor;brightness;contrast;display;ddc;
EOF

# Create symlink for easy access
if [ ! -L "$INSTALL_DIR/radiantctl" ]; then
    ln -sf "$APPIMAGE_PATH" "$INSTALL_DIR/radiantctl"
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_DIR"
fi

echo
echo -e "${GREEN}=== Installation Complete! ===${NC}"
echo
echo -e "${BLUE}Radiant Control has been installed to:${NC}"
echo -e "  AppImage: $APPIMAGE_PATH"
echo -e "  Desktop Entry: $DESKTOP_DIR/radiantctl.desktop"
echo -e "  Symlink: $INSTALL_DIR/radiantctl"
echo
echo -e "${YELLOW}To run Radiant Control:${NC}"
echo -e "  • From terminal: $INSTALL_DIR/radiantctl"
echo -e "  • From application menu: Search for 'Radiant Control'"
echo -e "  • Or double-click the AppImage file"
echo
echo -e "${YELLOW}Prerequisites:${NC}"
echo -e "  Make sure you have ddcutil installed and I2C permissions set up:"
echo -e "  sudo apt install ddcutil"
echo -e "  sudo usermod -aG i2c \$USER"
echo -e "  (Then re-login for group changes to take effect)"
echo
echo -e "${GREEN}Enjoy using Radiant Control!${NC}"
