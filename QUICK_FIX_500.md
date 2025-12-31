# Quick Fix for 500 Error

Run these commands on your VPS:

## Step 1: Check and Fix Permissions

```bash
sudo chown -R www-data:www-data /var/www/nextapp/dist
sudo chmod -R 755 /var/www/nextapp/dist
```

## Step 2: Check if dist folder exists

```bash
ls -la /var/www/nextapp/dist/
```

If it doesn't exist or is empty, rebuild:
```bash
cd /var/www/nextapp
npm run build
```

## Step 3: Check Nginx Error Logs

```bash
sudo tail -30 /var/log/nginx/error.log
```

## Step 4: Update Nginx Configuration

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

sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: Verify Backend is Running

```bash
pm2 status
pm2 logs backend --lines 20
```

## Step 6: Test Backend Directly

```bash
curl http://localhost:3001/health
```

If this works, the backend is fine. The issue is with Nginx.

## Step 7: Restart Everything

```bash
pm2 restart backend
sudo systemctl restart nginx
```

## Most Common Issues:

1. **dist folder missing**: Run `cd /var/www/nextapp && npm run build`
2. **Wrong permissions**: Run `sudo chown -R www-data:www-data /var/www/nextapp/dist`
3. **Backend not running**: Run `cd /var/www/nextapp/backend && pm2 restart backend`

