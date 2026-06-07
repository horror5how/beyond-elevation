#!/usr/bin/env bash
#
# Always-On Claude — one-command server setup for DigitalOcean (Ubuntu 24.04)
#
# Run this AS ROOT on a fresh droplet:
#   curl -fsSL https://raw.githubusercontent.com/horror5how/beyond-elevation/claude/code-desktop-connection-EI8H6/vps-setup/setup.sh | bash
#
# It hardens the server, installs Claude Code, turns on autonomous mode behind a
# safety fence, clones your repo, and sets up daily backups.
#
set -euo pipefail

# ----- Settings you can change ------------------------------------------------
NEW_USER="claude"
REPO_URL="https://github.com/horror5how/beyond-elevation.git"
REPO_DIR="/home/${NEW_USER}/beyond-elevation"
NODE_MAJOR="22"
# -----------------------------------------------------------------------------

log()  { printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
warn() { printf "\n\033[1;33m[!] %s\033[0m\n" "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run this as root (you logged in as root@your-server). Exiting."
  exit 1
fi

# 1) System update -------------------------------------------------------------
log "Updating the system (this can take a minute)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# 2) Core tools ----------------------------------------------------------------
log "Installing core tools (git, tmux, firewall, security blockers)..."
apt-get install -y \
  git curl tmux ufw fail2ban unattended-upgrades ca-certificates gnupg jq

# 3) Auto security updates -----------------------------------------------------
log "Turning on automatic security updates..."
dpkg-reconfigure -f noninteractive unattended-upgrades || true
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# 4) Create a non-root user and copy your SSH key ------------------------------
log "Creating your day-to-day user: ${NEW_USER}"
if ! id "${NEW_USER}" &>/dev/null; then
  adduser --disabled-password --gecos "" "${NEW_USER}"
  usermod -aG sudo "${NEW_USER}"
  # Allow this user to use sudo without a password (so autonomous tasks don't stall)
  echo "${NEW_USER} ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/90-${NEW_USER}
  chmod 0440 /etc/sudoers.d/90-${NEW_USER}
fi
# Copy the SSH key you used for root so you can log in as the new user too
mkdir -p /home/${NEW_USER}/.ssh
if [[ -f /root/.ssh/authorized_keys ]]; then
  cp /root/.ssh/authorized_keys /home/${NEW_USER}/.ssh/authorized_keys
fi
chown -R ${NEW_USER}:${NEW_USER} /home/${NEW_USER}/.ssh
chmod 700 /home/${NEW_USER}/.ssh
chmod 600 /home/${NEW_USER}/.ssh/authorized_keys 2>/dev/null || true

# 5) Lock the front door (SSH hardening) ---------------------------------------
log "Locking down remote login (keys only, no root, no passwords)..."
SSHD=/etc/ssh/sshd_config.d/99-hardening.conf
cat >"${SSHD}" <<'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
EOF
systemctl restart ssh || systemctl restart sshd || true

# 6) Firewall ------------------------------------------------------------------
log "Putting up the firewall (only SSH allowed in)..."
ufw allow OpenSSH
ufw --force enable

# 7) fail2ban (bans repeated break-in attempts) --------------------------------
log "Enabling the break-in blocker..."
systemctl enable --now fail2ban

# 8) Node.js (needed by Claude Code) -------------------------------------------
log "Installing Node.js ${NODE_MAJOR}..."
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y nodejs

# 9) Install Claude Code + clone your repo as the new user ---------------------
log "Installing Claude Code and cloning your project..."
sudo -u "${NEW_USER}" -H bash <<EOSU
set -euo pipefail
cd /home/${NEW_USER}

# Claude Code CLI (official installer)
curl -fsSL https://claude.ai/install.sh | bash || npm install -g @anthropic-ai/claude-code

# Make sure the installed binary is on PATH for future logins
if ! grep -q 'claude-code/bin' ~/.bashrc 2>/dev/null; then
  echo 'export PATH="\$HOME/.local/bin:\$PATH"' >> ~/.bashrc
fi

# Clone the project (skip if already there)
if [[ ! -d "${REPO_DIR}/.git" ]]; then
  git clone "${REPO_URL}" "${REPO_DIR}"
fi

# Install autonomous-mode settings (no per-action approvals, behind the fence)
mkdir -p "${REPO_DIR}/.claude"
curl -fsSL "https://raw.githubusercontent.com/horror5how/beyond-elevation/claude/code-desktop-connection-EI8H6/vps-setup/claude-settings.example.json" \
  -o "${REPO_DIR}/.claude/settings.local.json"

# Drop a .env template they can fill in (locked to owner-only)
if [[ ! -f "${REPO_DIR}/.env" ]]; then
  curl -fsSL "https://raw.githubusercontent.com/horror5how/beyond-elevation/claude/code-desktop-connection-EI8H6/vps-setup/.env.example" \
    -o "${REPO_DIR}/.env"
fi
chmod 600 "${REPO_DIR}/.env"
EOSU

# 10) Daily backup -------------------------------------------------------------
log "Setting up a daily backup..."
curl -fsSL "https://raw.githubusercontent.com/horror5how/beyond-elevation/claude/code-desktop-connection-EI8H6/vps-setup/backup.sh" \
  -o /home/${NEW_USER}/backup.sh
chown ${NEW_USER}:${NEW_USER} /home/${NEW_USER}/backup.sh
chmod +x /home/${NEW_USER}/backup.sh
# Run it every day at 3am
( crontab -u ${NEW_USER} -l 2>/dev/null; echo "0 3 * * * /home/${NEW_USER}/backup.sh >> /home/${NEW_USER}/backup.log 2>&1" ) | crontab -u ${NEW_USER} -

# 11) Done ---------------------------------------------------------------------
log "SETUP COMPLETE  ✅"
cat <<EOF

----------------------------------------------------------------------
WHAT TO DO NEXT (still logged in as root is fine):

1) Switch to your Claude user:
     su - ${NEW_USER}

2) Log Claude in to your account (one time):
     cd ${REPO_DIR}
     claude
   Follow the link it prints and sign in with your normal Claude account.
   Then type /exit to come back.

3) Put your passwords/keys into the .env file (only what the server needs):
     nano ${REPO_DIR}/.env
   (Ctrl+O to save, Ctrl+X to exit.)

4) Connect WhatsApp — follow vps-setup/whatsapp.md

After that, your always-on Claude is live. Message it from WhatsApp anytime.
----------------------------------------------------------------------
EOF
