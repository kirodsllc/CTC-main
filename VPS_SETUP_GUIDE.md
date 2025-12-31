# VPS Setup Guide for Next.js/React Application

This guide will help you set up your application on an Ubuntu VPS server.

## Prerequisites

- Ubuntu server with root or sudo access
- SSH access to your VPS
- Domain name (optional, for production)

## Step 1: Upload Files to VPS

### Option A: Using SCP (from your local machine)

```bash
# Compress the Upload folder first (on Windows, use 7-Zip or WinRAR)
# Then upload using SCP:
scp -r Upload.zip root@your-vps-ip:/var/www/nextapp/

# Or if uploading the folder directly:
scp -r Upload/* root@your-vps-ip:/var/www/nextapp/
```

### Option B: Using SFTP (FileZilla, WinSCP, etc.)

1. Connect to your VPS using SFTP
2. Navigate to `/var/www/nextapp/`
3. Upload all files from the Upload folder

### Option C: Using Git (if you have a repository)

```bash
# On VPS
cd /var/www/nextapp
git clone your-repository-url .
```

## Step 2: Install Required Software on VPS

SSH into your VPS and run:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18 or v20 recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 (Process Manager for Node.js)
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt install -y nginx

# Install build tools (required for some npm packages)
sudo apt install -y build-essential python3
```

## Step 3: Set Up Backend

```bash
# Navigate to backend directory
cd /var/www/nextapp/backend

# Install backend dependencies
npm install

# Build the backend
npm run build

# Generate Prisma client
npx prisma generate

# Set up environment variables
nano .env
```

### Backend .env file should contain:

```env
# Database
DATABASE_URL="file:./prisma/inventory.db"

# Server
PORT=3001
NODE_ENV=production

# CORS (adjust with your domain)
CORS_ORIGIN=http://localhost:8080,http://your-domain.com

# Add other environment variables as needed
```

### Run database migrations:

```bash
# Deploy migrations
npm run migrate:deploy

# Or if using SQLite, the database file should be created automatically
```

### Start backend with PM2:

```bash
# Start backend
pm2 start npm --name "backend" -- start

# Or if you built it:
pm2 start dist/server.js --name "backend"

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

## Step 4: Set Up Frontend

```bash
# Navigate to root directory
cd /var/www/nextapp

# Install frontend dependencies
npm install

# Build the frontend for production
npm run build

# The built files will be in the 'dist' folder
```

## Step 5: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/nextapp
```

### Add this configuration:

```nginx
# Backend API
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        root /var/www/nextapp/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Static assets
    location /assets {
        root /var/www/nextapp/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

## Step 6: Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx for HTTPS
```

## Step 7: Set Permissions

```bash
# Set proper ownership (replace 'www-data' with your user if needed)
sudo chown -R $USER:$USER /var/www/nextapp

# Set proper permissions
sudo chmod -R 755 /var/www/nextapp

# For backend database (if using SQLite)
sudo chmod 664 /var/www/nextapp/backend/prisma/*.db
sudo chmod 664 /var/www/nextapp/backend/prisma/*.db-journal
```

## Step 8: Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow SSH (important!)
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 9: Verify Installation

1. **Check Backend:**
   ```bash
   # Check if backend is running
   pm2 status
   
   # Check backend logs
   pm2 logs backend
   
   # Test backend API
   curl http://localhost:3001/api/health
   ```

2. **Check Frontend:**
   - Open your browser and navigate to `http://your-vps-ip` or `http://your-domain.com`
   - The frontend should load

3. **Check Nginx:**
   ```bash
   sudo systemctl status nginx
   ```

## Useful Commands

### PM2 Commands:
```bash
# View all processes
pm2 list

# View logs
pm2 logs

# Restart backend
pm2 restart backend

# Stop backend
pm2 stop backend

# Delete process
pm2 delete backend

# Monitor
pm2 monit
```

### Nginx Commands:
```bash
# Restart Nginx
sudo systemctl restart nginx

# Reload Nginx (without downtime)
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Update Application:
```bash
# Navigate to app directory
cd /var/www/nextapp

# Pull latest changes (if using Git)
git pull

# Rebuild backend
cd backend
npm install
npm run build
pm2 restart backend

# Rebuild frontend
cd ..
npm install
npm run build

# Reload Nginx
sudo systemctl reload nginx
```

## Troubleshooting

### Backend not starting:
- Check PM2 logs: `pm2 logs backend`
- Verify .env file exists and has correct values
- Check if port 3001 is available: `sudo netstat -tulpn | grep 3001`

### Frontend not loading:
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify dist folder exists: `ls -la /var/www/nextapp/dist`
- Check Nginx configuration: `sudo nginx -t`

### Database issues:
- Check database file permissions
- Verify DATABASE_URL in .env
- Run migrations: `cd backend && npm run migrate:deploy`

### Port conflicts:
- Check what's using a port: `sudo lsof -i :3001` or `sudo lsof -i :80`
- Kill process if needed: `sudo kill -9 <PID>`

## Security Recommendations

1. **Use environment variables** for sensitive data
2. **Enable firewall** (ufw)
3. **Use SSL/HTTPS** (Let's Encrypt)
4. **Keep system updated**: `sudo apt update && sudo apt upgrade`
5. **Use strong passwords** for database and admin accounts
6. **Regular backups** of database and files
7. **Limit SSH access** (disable root login, use SSH keys)

## Backup Script

Create a backup script:

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/var/backups/nextapp"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/nextapp/backend/prisma/*.db $BACKUP_DIR/db_$DATE.db

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/nextapp

echo "Backup completed: $DATE"
```

Make it executable:
```bash
chmod +x backup.sh
```

Add to crontab for daily backups:
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

