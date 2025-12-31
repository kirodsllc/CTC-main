# Quick VPS Setup Commands

Copy and paste these commands on your Ubuntu VPS server.

## 1. Initial Setup (Run once)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install build tools
sudo apt install -y build-essential python3
```

## 2. Upload Files to VPS

**From your local Windows machine (PowerShell):**

```powershell
# Compress the Upload folder first (or use WinRAR/7-Zip)
Compress-Archive -Path Upload -DestinationPath Upload.zip

# Upload using SCP (replace YOUR_VPS_IP with your actual IP)
scp Upload.zip root@YOUR_VPS_IP:/var/www/nextapp/

# Then SSH into VPS and extract:
# ssh root@YOUR_VPS_IP
# cd /var/www/nextapp
# unzip Upload.zip
# mv Upload/* .
# rm -rf Upload Upload.zip
```

## 3. Backend Setup

```bash
cd /var/www/nextapp/backend

# Install dependencies
npm install

# Build backend
npm run build

# Generate Prisma client
npx prisma generate

# Create .env file
nano .env
```

**Add to .env:**
```
DATABASE_URL="file:./prisma/inventory.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:8080
```

**Start backend:**
```bash
pm2 start npm --name "backend" -- start
pm2 save
pm2 startup
```

## 4. Frontend Setup

```bash
cd /var/www/nextapp

# Install dependencies
npm install

# Build frontend
npm run build
```

## 5. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/nextapp
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name _;  # Replace with your domain or IP

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

    location / {
        root /var/www/nextapp/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        root /var/www/nextapp/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 6. Set Permissions

```bash
sudo chown -R $USER:$USER /var/www/nextapp
sudo chmod -R 755 /var/www/nextapp
```

## 7. Configure Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## 8. Verify Everything Works

```bash
# Check backend
pm2 status
pm2 logs backend

# Check Nginx
sudo systemctl status nginx

# Test API
curl http://localhost:3001/api/health
```

## Quick Commands Reference

```bash
# Restart backend
pm2 restart backend

# View backend logs
pm2 logs backend

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Rebuild after updates
cd /var/www/nextapp/backend && npm run build && pm2 restart backend
cd /var/www/nextapp && npm run build && sudo systemctl reload nginx
```

