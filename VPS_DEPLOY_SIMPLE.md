# Simple VPS Deployment Commands

Your files are in `/var/www/nextapp/Upload`. Follow these commands step by step.

## Step 1: Move Files to Correct Location

```bash
cd /var/www/nextapp
mv Upload/* .
rmdir Upload
```

## Step 2: Install Node.js (if not installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Step 3: Install PM2 and Nginx

```bash
sudo npm install -g pm2
sudo apt install -y nginx build-essential python3
```

## Step 4: Install Frontend Dependencies

```bash
cd /var/www/nextapp
npm install
```

## Step 5: Install Backend Dependencies

```bash
cd /var/www/nextapp/backend
npm install
```

## Step 6: Build Frontend

```bash
cd /var/www/nextapp
npm run build
```

## Step 7: Build Backend

```bash
cd /var/www/nextapp/backend
npm run build
npx prisma generate
```

## Step 8: Create Backend Environment File

```bash
cd /var/www/nextapp/backend
nano .env
```

**Paste this content:**
```
DATABASE_URL="file:./prisma/inventory.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:8080,http://your-domain.com
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

## Step 9: Run Database Migrations

```bash
cd /var/www/nextapp/backend
npm run migrate:deploy
```

## Step 10: Start Backend with PM2

```bash
cd /var/www/nextapp/backend
pm2 start npm --name "backend" -- start
pm2 save
pm2 startup
```

## Step 11: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/nextapp
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name _;

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

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

## Step 12: Enable Nginx Site

```bash
sudo ln -s /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 13: Set Permissions

```bash
sudo chown -R $USER:$USER /var/www/nextapp
sudo chmod -R 755 /var/www/nextapp
```

## Step 14: Configure Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Step 15: Verify Everything Works

```bash
# Check backend status
pm2 status

# Check backend logs
pm2 logs backend

# Check Nginx status
sudo systemctl status nginx

# Test API
curl http://localhost:3001/api/health
```

## Done! 

Your website should now be live at:
- **Frontend:** `http://your-vps-ip` or `http://your-domain.com`
- **Backend API:** `http://your-vps-ip/api` or `http://your-domain.com/api`

## Quick Commands for Later

```bash
# Restart backend
pm2 restart backend

# View backend logs
pm2 logs backend

# Restart Nginx
sudo systemctl restart nginx

# Rebuild after updates
cd /var/www/nextapp && npm run build
cd /var/www/nextapp/backend && npm run build && pm2 restart backend
```

