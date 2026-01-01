# Setup Cursor IDE on VPS

## Prerequisites
- Cursor IDE installed on your local Windows machine
- SSH access to your VPS (103.60.12.157)
- Root access or a user with sudo privileges

## Step 1: Install Cursor Server on VPS

Run this command on your VPS:

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install required dependencies
sudo apt-get update
sudo apt-get install -y build-essential python3
```

## Step 2: Configure SSH for Cursor

### Option A: Using SSH Key (Recommended)

1. **Generate SSH key on your local machine** (if you don't have one):
   ```powershell
   ssh-keygen -t ed25519 -C "cursor-vps"
   ```

2. **Copy public key to VPS**:
   ```powershell
   type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@103.60.12.157 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
   ```

3. **Test SSH connection**:
   ```powershell
   ssh root@103.60.12.157
   ```

### Option B: Using Password (Less Secure)

Just use your existing password when connecting.

## Step 3: Connect Cursor to VPS

1. **Open Cursor IDE** on your local machine

2. **Open Command Palette**:
   - Press `Ctrl+Shift+P` (Windows)

3. **Connect to Remote**:
   - Type: `Remote-SSH: Connect to Host`
   - Select: `Add New SSH Host`
   - Enter: `root@103.60.12.157`
   - Choose SSH config file location (usually `C:\Users\YourName\.ssh\config`)

4. **Edit SSH Config** (if needed):
   ```
   Host vps-server
       HostName 103.60.12.157
       User root
       Port 22
       IdentityFile ~/.ssh/id_ed25519
   ```

5. **Connect**:
   - Press `Ctrl+Shift+P`
   - Type: `Remote-SSH: Connect to Host`
   - Select: `vps-server` or `root@103.60.12.157`
   - Enter password if prompted

6. **Open Folder**:
   - After connection, open: `/var/www/nextapp`

## Step 4: Install Cursor Extensions on Remote

Once connected, install these extensions:
- Prisma
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

## Step 5: Configure Cursor Settings

Create `.cursor/settings.json` in your project:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

## Troubleshooting

### Connection Issues
- Check SSH service: `sudo systemctl status ssh`
- Check firewall: `sudo ufw status`
- Verify SSH key permissions: `chmod 600 ~/.ssh/authorized_keys`

### Performance Issues
- Increase SSH connection timeout
- Use compression: Add `Compression yes` to SSH config
- Use faster cipher: Add `Ciphers aes128-ctr,aes192-ctr,aes256-ctr` to SSH config

