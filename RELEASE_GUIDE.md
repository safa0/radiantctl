# Release Guide for Radiant Control

This guide explains how to create and publish new releases of Radiant Control.

## Prerequisites

1. **GitHub CLI**: Install and authenticate with `gh auth login`
2. **Node.js**: Version 18 or higher
3. **Rust**: Latest stable version
4. **System Dependencies**: See the GitHub Actions workflow for required packages

## Release Process

### 1. Update Version Numbers

Before creating a release, update the version numbers in:

- `package.json` - Update the `version` field
- `src-tauri/Cargo.toml` - Update the `version` field
- `src-tauri/tauri.conf.json` - Update the `version` field

### 2. Create Release Script

Update the version in `create_release.sh`:

```bash
VERSION="0.1.1"  # Change this to your new version
```

### 3. Build and Test

```bash
# Install dependencies
npm install

# Build the application
npm run tauri build

# Test the AppImage locally
chmod +x src-tauri/target/release/bundle/appimage/radiantctl_*.AppImage
./src-tauri/target/release/bundle/appimage/radiantctl_*.AppImage
```

### 4. Create Git Tag and Push

```bash
# Commit any changes
git add .
git commit -m "Prepare for release v0.1.1"

# Create and push tag
git tag -a v0.1.1 -m "Release v0.1.1"
git push origin main --tags
```

### 5. Create GitHub Release

#### Option A: Using the Release Script (Recommended)

```bash
./create_release.sh
```

#### Option B: Manual Release

```bash
gh release create v0.1.1 \
    --title "Release v0.1.1" \
    --notes "Release notes here" \
    src-tauri/target/release/bundle/appimage/radiantctl_*.AppImage \
    src-tauri/target/release/bundle/deb/radiantctl_*.deb \
    src-tauri/target/release/bundle/rpm/radiantctl-*.rpm
```

### 6. Update Documentation

After the release is published:

1. Update the version badge in `README.md`
2. Update any version-specific instructions
3. Add screenshots if the UI has changed
4. Update the installation script if needed

## Automated Releases

The project includes a GitHub Actions workflow (`.github/workflows/release.yml`) that automatically:

1. Builds the application when a tag is pushed
2. Creates a GitHub release with all distribution formats
3. Generates release notes

To use automated releases:

```bash
# Just push a tag and the workflow will handle the rest
git tag -a v0.1.1 -m "Release v0.1.1"
git push origin main --tags
```

## Distribution Formats

The build process creates three distribution formats:

1. **AppImage** (`radiantctl_0.1.1_amd64.AppImage`)
   - Self-contained executable
   - Works on most Linux distributions
   - No installation required

2. **Debian Package** (`radiantctl_0.1.1_amd64.deb`)
   - For Ubuntu, Debian, and derivatives
   - Installs system-wide

3. **RPM Package** (`radiantctl-0.1.1-1.x86_64.rpm`)
   - For Fedora, RHEL, and derivatives
   - Installs system-wide

## Release Checklist

- [ ] Update version numbers in all files
- [ ] Test the build locally
- [ ] Update release notes
- [ ] Create git tag
- [ ] Push changes and tag
- [ ] Create GitHub release
- [ ] Update documentation
- [ ] Test installation on clean system
- [ ] Announce release (social media, forums, etc.)

## Troubleshooting

### Build Issues

1. **TypeScript Errors**: Fix any TypeScript compilation errors before building
2. **Missing Dependencies**: Ensure all system dependencies are installed
3. **Permission Issues**: Make sure you have write permissions to the target directory

### Release Issues

1. **GitHub CLI Not Authenticated**: Run `gh auth login`
2. **Tag Already Exists**: Delete the tag locally and remotely, then recreate
3. **Upload Fails**: Check file sizes and GitHub's upload limits

### AppImage Issues

1. **Not Executable**: Run `chmod +x filename.AppImage`
2. **Missing Dependencies**: AppImages should be self-contained, but some systems may need additional libraries
3. **Permission Denied**: Ensure the user has proper I2C permissions

## Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

## Support

For issues with the release process:

1. Check the GitHub Actions logs
2. Review the build output for errors
3. Test the AppImage on a clean system
4. Create an issue on GitHub if problems persist
