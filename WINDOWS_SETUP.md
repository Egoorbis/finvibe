# Windows Setup Guide for FinVibe

This guide helps Windows users set up FinVibe with Node.js 25 and better-sqlite3.

## Prerequisites

### Node.js 25
Ensure you have Node.js 25 installed. Check with:
```bash
node --version
```

### Windows Build Tools for better-sqlite3

better-sqlite3 is a native Node.js addon that requires compilation on Windows. You need Visual Studio Build Tools with the Windows SDK.

## Option 1: Install Visual Studio Build Tools (Recommended)

1. **Download Visual Studio Build Tools**:
   - Visit: https://visualstudio.microsoft.com/downloads/
   - Scroll down to "Tools for Visual Studio"
   - Download "Build Tools for Visual Studio 2022"

2. **Install Required Components**:
   During installation, select:
   - ✅ **Desktop development with C++** workload
   - ✅ **Windows 10 SDK** or **Windows 11 SDK** (under Individual components)
   - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools**

3. **Verify Installation**:
   ```bash
   npm config get msvs_version
   ```

## Option 2: Use Pre-built Binaries (Easier but Less Reliable)

If you don't want to install Visual Studio, better-sqlite3 v12.8.0 has improved prebuild support. Try:

```bash
npm install --prefer-offline
```

If prebuilds aren't available for Node.js 25 on Windows, you'll need Option 1.

## Option 3: Use WSL2 (Linux Subsystem)

For a simpler experience without Windows build tools:

1. **Install WSL2**:
   ```powershell
   wsl --install
   ```

2. **Install Node.js in WSL2**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_25.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Run FinVibe from WSL2**:
   ```bash
   cd /mnt/d/Code/GitHub_Repos/own/finvibe
   npm install
   npm run dev
   ```

## Installation Steps

Once you have the build tools installed:

### Backend Setup
```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting

### Error: "Could not find any Visual Studio installation to use"
- Install Visual Studio Build Tools with "Desktop development with C++" workload
- Make sure Windows SDK is selected during installation

### Error: "No prebuilt binaries found"
- This is a warning, not an error - node-gyp will compile from source
- Ensure Visual Studio Build Tools are properly installed
- Alternatively, try: `npm install --build-from-source`

### Error: "missing any Windows SDK"
- Open Visual Studio Installer
- Modify your Build Tools installation
- Under "Individual components", select a Windows 10 or 11 SDK
- Install and retry

### Permission Errors (EPERM)
- Close all applications that might have locks on node_modules
- Run PowerShell or CMD as Administrator
- Delete node_modules: `rm -r node_modules` (PowerShell) or `rmdir /s /q node_modules` (CMD)
- Retry: `npm install`

## Alternative: Use Docker

If Windows setup is too complex, use Docker:

```bash
docker-compose up
```

This avoids all native compilation issues.

## Node.js Version Compatibility

- **Minimum**: Node.js 18 LTS
- **Recommended**: Node.js 20 LTS or Node.js 25
- **better-sqlite3 v12.8.0**: Fully supports Node.js 25

## Additional Notes

- The deprecated warnings for `inflight` and `glob@7.2.3` come from Jest 29.7.0
- These will be resolved when Jest 30+ is released as stable
- They don't affect functionality but are transitive dependencies
- `prebuild-install` is deprecated but still used by better-sqlite3 v12 - this is a known issue
