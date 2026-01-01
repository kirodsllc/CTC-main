#!/bin/bash

# Setup Cursor IDE on VPS
# This script prepares the VPS for Cursor IDE connection

set +e

echo "=========================================="
echo "  Setup Cursor IDE on VPS"
echo "=========================================="
echo ""

# Step 1: Check Node.js
echo "Step 1: Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "[✓] Node.js installed: $NODE_VERSION"
else
    echo "[!] Node.js not found, installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "[✓] Node.js installed"
fi

# Step 2: Check npm
echo ""
echo "Step 2: Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "[✓] npm installed: $NPM_VERSION"
else
    echo "[✗] npm not found"
    exit 1
fi

# Step 3: Install build tools
echo ""
echo "Step 3: Installing build tools..."
sudo apt-get update > /dev/null 2>&1
sudo apt-get install -y build-essential python3 > /dev/null 2>&1
echo "[✓] Build tools installed"

# Step 4: Check SSH service
echo ""
echo "Step 4: Checking SSH service..."
if systemctl is-active --quiet ssh || systemctl is-active --quiet sshd; then
    echo "[✓] SSH service is running"
else
    echo "[!] SSH service not running, starting..."
    sudo systemctl start ssh || sudo systemctl start sshd
    sudo systemctl enable ssh || sudo systemctl enable sshd
    echo "[✓] SSH service started"
fi

# Step 5: Configure SSH for better performance
echo ""
echo "Step 5: Configuring SSH..."
SSH_CONFIG="/etc/ssh/sshd_config"
if [ -f "$SSH_CONFIG" ]; then
    # Backup config
    sudo cp "$SSH_CONFIG" "$SSH_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Enable compression
    if ! grep -q "^Compression yes" "$SSH_CONFIG"; then
        echo "Compression yes" | sudo tee -a "$SSH_CONFIG" > /dev/null
        echo "[✓] SSH compression enabled"
    fi
    
    # Increase connection timeout
    if ! grep -q "^ClientAliveInterval" "$SSH_CONFIG"; then
        echo "ClientAliveInterval 60" | sudo tee -a "$SSH_CONFIG" > /dev/null
        echo "ClientAliveCountMax 3" | sudo tee -a "$SSH_CONFIG" > /dev/null
        echo "[✓] SSH timeout configured"
    fi
    
    # Restart SSH if config changed
    sudo systemctl restart ssh || sudo systemctl restart sshd
    echo "[✓] SSH service restarted"
fi

# Step 6: Check firewall
echo ""
echo "Step 6: Checking firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        if sudo ufw status | grep -q "22/tcp"; then
            echo "[✓] SSH port (22) is allowed in firewall"
        else
            echo "[!] Opening SSH port in firewall..."
            sudo ufw allow 22/tcp
            echo "[✓] SSH port opened"
        fi
    else
        echo "[i] Firewall is not active"
    fi
fi

# Step 7: Create project directory structure
echo ""
echo "Step 7: Checking project structure..."
PROJECT_DIR="/var/www/nextapp"
if [ -d "$PROJECT_DIR" ]; then
    echo "[✓] Project directory exists: $PROJECT_DIR"
    
    # Set proper permissions
    sudo chown -R $USER:$USER "$PROJECT_DIR" 2>/dev/null || true
    echo "[✓] Permissions set"
else
    echo "[!] Project directory not found: $PROJECT_DIR"
fi

# Step 8: Install global npm packages for development
echo ""
echo "Step 8: Installing development tools..."
if ! command -v typescript &> /dev/null; then
    npm install -g typescript typescript-language-server
    echo "[✓] TypeScript installed globally"
else
    echo "[✓] TypeScript already installed"
fi

# Step 9: Create SSH info file
echo ""
echo "Step 9: Creating connection info..."
cat > ~/cursor-connection-info.txt << EOF
==========================================
  Cursor IDE Connection Information
==========================================

Server IP: 103.60.12.157
Username: root
Port: 22

Connection String:
  root@103.60.12.157

SSH Config (add to ~/.ssh/config on your local machine):
  Host vps-cursor
      HostName 103.60.12.157
      User root
      Port 22
      Compression yes
      ServerAliveInterval 60
      ServerAliveCountMax 3

Project Path on Server:
  /var/www/nextapp

To connect from Cursor:
  1. Press Ctrl+Shift+P
  2. Type: Remote-SSH: Connect to Host
  3. Enter: root@103.60.12.157
  4. Enter password when prompted
  5. Open folder: /var/www/nextapp

Troubleshooting:
  - Check SSH: systemctl status ssh
  - Check firewall: ufw status
  - Test connection: ssh root@103.60.12.157

EOF
echo "[✓] Connection info saved to: ~/cursor-connection-info.txt"
cat ~/cursor-connection-info.txt

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Your VPS is now ready for Cursor IDE connection."
echo "Follow the instructions in cursor-connection-info.txt"
echo ""

