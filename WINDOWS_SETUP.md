# Windows Setup Guide for FinVibe

This guide helps Windows users set up FinVibe with Node.js 25 and PostgreSQL.

## Prerequisites

### Node.js 25
Ensure you have Node.js 25 installed. Check with:
```bash
node --version
```

### PostgreSQL

Install PostgreSQL locally (https://www.postgresql.org/download/windows/) or run the included Docker Compose stack to start a local database:
```bash
docker compose up -d postgres
```

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

## Additional Notes

- The deprecated warnings for `inflight` and `glob@7.2.3` come from Jest 29.7.0
- These will be resolved when Jest 30+ is released as stable
- They don't affect functionality but are transitive dependencies
