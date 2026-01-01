# Cursor IDE - VPS Connection Guide

## Quick Connection Steps

### 1. Install Remote-SSH Extension
- Open Cursor IDE
- Press `Ctrl+Shift+X` (Extensions)
- Search: `Remote - SSH`
- Install the extension

### 2. Connect to VPS
- Press `Ctrl+Shift+P`
- Type: `Remote-SSH: Connect to Host`
- Enter: `root@103.60.12.157`
- Enter password when prompted

### 3. Open Project
- After connection, click `Open Folder`
- Enter: `/var/www/nextapp`
- Click OK

## SSH Config (Optional - for easier connection)

Create/edit `C:\Users\YourName\.ssh\config`:

```
Host vps-cursor
    HostName 103.60.12.157
    User root
    Port 22
    Compression yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then connect using: `vps-cursor` instead of `root@103.60.12.157`

## Troubleshooting

### Connection Fails
- Check SSH service: `systemctl status ssh` (on VPS)
- Test connection: `ssh root@103.60.12.157` (from your PC)
- Check firewall: `ufw status` (on VPS)

### Slow Connection
- Already configured: SSH compression and keepalive enabled
- Use wired connection if possible
- Close other SSH connections

### Permission Denied
- Make sure you're using the correct password
- Check SSH key if using key-based auth

## What You Can Do After Connection

1. **Edit Files**: Directly edit files on the VPS
2. **Run Terminal**: Open integrated terminal (Ctrl+`)
3. **Install Extensions**: Install extensions for remote development
4. **Debug**: Debug your Node.js/TypeScript code remotely
5. **Git Operations**: Commit, push, pull directly from Cursor

## Recommended Extensions for Remote Development

- **Remote - SSH** (already installed)
- **Prisma** (for database schema)
- **ESLint** (code linting)
- **Prettier** (code formatting)
- **GitLens** (Git integration)
- **Thunder Client** (API testing)

## Project Structure

After opening `/var/www/nextapp`, you'll see:
```
/var/www/nextapp/
├── backend/          # Backend code
│   ├── src/         # Source files
│   ├── prisma/      # Database schema
│   └── dist/        # Compiled files
├── frontend/         # Frontend code (if exists)
└── ...
```

## Quick Commands in Cursor Terminal

Once connected, you can run:
- `pm2 status` - Check backend status
- `pm2 logs backend` - View backend logs
- `cd /var/www/nextapp/backend && npm run build` - Build backend
- `sqlite3 prisma/inventory.db "SELECT COUNT(*) FROM Part;"` - Query database

