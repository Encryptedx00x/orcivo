#!/bin/bash
# vps-init.sh — Hardening inicial da VPS Orcivo
# Executar como root na VPS após primeiro acesso via console Hostinger
# Testado em: Ubuntu 22.04 LTS / Debian 12
# Uso: bash vps-init.sh <username> <ssh_pubkey>
# Exemplo: bash vps-init.sh dyogo "ssh-ed25519 AAAA..."

set -euo pipefail

USERNAME="${1:?Informe o username: bash vps-init.sh <username> <ssh_pubkey>}"
SSH_PUBKEY="${2:?Informe a chave pública SSH}"

echo "=== [1/8] Atualizando sistema ==="
apt-get update -qq && apt-get upgrade -y -qq

echo "=== [2/8] Configurando timezone ==="
timedatectl set-timezone America/Sao_Paulo
timedatectl status

echo "=== [3/8] Criando usuário não-root ==="
if ! id "$USERNAME" &>/dev/null; then
  useradd -m -s /bin/bash "$USERNAME"
  usermod -aG sudo "$USERNAME"
  echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$USERNAME"
  chmod 0440 "/etc/sudoers.d/$USERNAME"
fi

echo "=== [4/8] Configurando SSH por chave ==="
SSH_DIR="/home/$USERNAME/.ssh"
mkdir -p "$SSH_DIR"
echo "$SSH_PUBKEY" > "$SSH_DIR/authorized_keys"
chown -R "$USERNAME:$USERNAME" "$SSH_DIR"
chmod 700 "$SSH_DIR"
chmod 600 "$SSH_DIR/authorized_keys"

# Hardening do sshd_config
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#*Port .*/Port 22/' /etc/ssh/sshd_config
systemctl restart sshd

echo "=== [5/8] Configurando UFW ==="
apt-get install -y -qq ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose

echo "=== [6/8] Instalando e configurando fail2ban ==="
apt-get install -y -qq fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s
maxretry = 3
bantime  = 24h
EOF
systemctl enable fail2ban
systemctl restart fail2ban

echo "=== [7/8] Instalando Docker ==="
apt-get install -y -qq ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker "$USERNAME"
systemctl enable docker
systemctl start docker
docker compose version

echo "=== [8/8] Configurando swap de 4GB ==="
if [ "$(swapon --show | wc -l)" -eq 0 ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi
free -h

echo ""
echo "=== HARDENING CONCLUÍDO ==="
echo "AVISO: Teste o SSH com a chave antes de fechar esta sessão root!"
echo "  ssh $USERNAME@<IP_DA_VPS>"
echo ""
echo "Verificações:"
echo "  ufw status verbose"
echo "  timedatectl"
echo "  docker compose version"
echo "  swapon --show"
echo "  fail2ban-client status sshd"
