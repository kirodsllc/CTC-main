# Fix Commands for Your VPS

Run these commands to fix the issues:

## Step 1: Create Backend .env File

```bash
cd /var/www/nextapp/backend
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/inventory.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:8080
EOF
```

## Step 2: Run Database Migrations

```bash
cd /var/www/nextapp/backend
npm run migrate:deploy
```

## Step 3: Create Nginx Configuration

```bash
sudo tee /etc/nginx/sites-available/nextapp > /dev/null << 'EOF'
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
EOF
```

## Step 4: Enable Nginx Site

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/nextapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: Start Backend with PM2

```bash
cd /var/www/nextapp/backend
pm2 start npm --name "backend" -- start
pm2 save
pm2 startup
```

## Step 6: Verify Everything

```bash
# Check backend status
pm2 status

# Check backend logs
pm2 logs backend

# Test API
curl http://localhost:3001/api/health

# Check Nginx
sudo systemctl status nginx
```

Your website should now be live!

