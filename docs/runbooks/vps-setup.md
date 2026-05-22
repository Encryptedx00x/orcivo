# Runbook — Provisionamento da VPS Orcivo

**Provider:** Hostinger  
**Spec:** KVM1 — 1 vCPU, 4GB RAM, 50GB NVMe  
**SO alvo:** Ubuntu 22.04 LTS ou Debian 12  
**Última revisão:** 2026-05-21  

---

## Pré-requisitos

### 1. Conta e VPS na Hostinger

1. Criar conta em hostinger.com (ou fazer login)
2. Contratar plano **KVM1** (VPS → VPS Hosting → KVM1)
3. Selecionar SO: **Ubuntu 22.04 LTS** (recomendado) ou Debian 12
4. Selecionar datacenter: Brasil (São Paulo) se disponível
5. Aguardar provisionamento (~2-5 min)
6. Anotar o **IP da VPS** no painel Hostinger

### 2. Domínio (pré-requisito para D0.3)

> O domínio NÃO é bloqueante para o hardening da VPS (D0.2), mas é necessário antes de configurar o Caddy com HTTPS (D0.3).

1. Registrar o domínio em qualquer registrador (ex: Registro.br, Hostinger, GoDaddy)
2. Sugestão: `orcivo.com.br` ou `orcivo.app`
3. Após registro, apontar os nameservers para Hostinger ou configurar DNS no registrador (ver D0.3)
4. Nos planos D0.3, substituir `seudominio.com.br` pelo domínio real

### 3. Chave SSH local

Gerar chave SSH localmente (se ainda não tiver):

```bash
# No terminal do seu computador (não na VPS)
ssh-keygen -t ed25519 -C "orcivo-vps" -f ~/.ssh/orcivo_vps
cat ~/.ssh/orcivo_vps.pub  # copiar esta chave para usar no script
```

---

## Execução

### Passo 1 — Primeiro acesso como root

Acessar a VPS pelo console web da Hostinger (ou via SSH root temporário):

```bash
# Via SSH root temporário (senha gerada pela Hostinger)
ssh root@<IP_DA_VPS>
```

### Passo 2 — Baixar e executar o script de hardening

```bash
# Na VPS como root
curl -fsSL https://raw.githubusercontent.com/Encryptedx00x/orcivo/main/infra/scripts/vps-init.sh \
  -o /tmp/vps-init.sh

# OU via scp do computador local:
# scp infra/scripts/vps-init.sh root@<IP_DA_VPS>:/tmp/

bash /tmp/vps-init.sh dyogo "ssh-ed25519 AAAA...sua_chave_publica_aqui"
```

> Substituir `dyogo` pelo username desejado e `"ssh-ed25519 AAAA..."` pela saída de `cat ~/.ssh/orcivo_vps.pub`

### Passo 3 — Verificar hardening (ANTES de fechar a sessão root)

```bash
# Ainda como root — verificar cada item antes de fechar a sessão
ufw status verbose          # deve mostrar 22, 80, 443 ALLOW
timedatectl                 # deve mostrar America/Sao_Paulo
docker compose version      # deve retornar versão sem erro
swapon --show               # deve mostrar /swapfile 4G
fail2ban-client status sshd # deve mostrar jail ativo
free -h                     # deve mostrar ~4G swap disponível
```

### Passo 4 — Testar SSH com chave (nova sessão)

**Em um novo terminal no seu computador** (não fechar a sessão root ainda):

```bash
ssh -i ~/.ssh/orcivo_vps dyogo@<IP_DA_VPS>
```

Se conectou: o hardening está correto. Pode fechar a sessão root.  
Se não conectou: revisar o arquivo `/home/dyogo/.ssh/authorized_keys` na sessão root.

### Passo 5 — Confirmar que root não acessa por senha

```bash
# Tentar em novo terminal — DEVE FALHAR
ssh root@<IP_DA_VPS>
# Expected: "Permission denied (publickey)"
```

---

## Verificação final (checklist INFRA-01..09)

Execute como usuário não-root na VPS após o hardening:

```bash
# INFRA-01: SO atualizado
lsb_release -a

# INFRA-02 + INFRA-03: Usuário e SSH
whoami                              # deve ser o username não-root
grep 'PasswordAuthentication' /etc/ssh/sshd_config  # deve ser 'no'
grep 'PermitRootLogin' /etc/ssh/sshd_config         # deve ser 'no'

# INFRA-04: UFW
sudo ufw status verbose             # 22, 80, 443 ALLOW; default DENY

# INFRA-05: fail2ban
sudo fail2ban-client status         # deve listar jail 'sshd'
sudo fail2ban-client status sshd

# INFRA-06: Docker
docker compose version              # deve retornar versão
docker run --rm hello-world         # deve executar e remover container

# INFRA-07: Timezone
timedatectl | grep 'Time zone'      # deve mostrar America/Sao_Paulo

# INFRA-08: Swap
swapon --show                       # deve mostrar /swapfile, SIZE 4G
free -h | grep Swap                 # deve mostrar ~4G

# INFRA-09: Runbook executado com sucesso — este arquivo é o artefato
```

---

## Troubleshooting

### Docker permission denied

```bash
# Adicionar usuário ao grupo docker e relogar
sudo usermod -aG docker $USER
newgrp docker
# OU fazer logout e login novamente
```

### Swap não aparece após reboot

```bash
# Verificar se está no fstab
grep swapfile /etc/fstab  # deve mostrar '/swapfile none swap sw 0 0'
sudo swapon /swapfile     # ativar manualmente se necessário
```

### fail2ban não inicia no Debian 12

```bash
sudo systemctl status fail2ban
# Se erro de backend: editar /etc/fail2ban/jail.local e trocar 'backend = systemd' por 'backend = auto'
sudo systemctl restart fail2ban
```

### sshd_config não tem a linha para substituir

Alguns provedores entregam um `sshd_config` enxuto sem as linhas comentadas. Nesse caso, adicionar manualmente:

```bash
echo "PermitRootLogin no" >> /etc/ssh/sshd_config
echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
systemctl restart sshd
```

---

## Próximo passo

Após este runbook concluído com sucesso: **D0.3 — Stack core** (`docs/runbooks/stack-setup.md`).

Pré-requisito para D0.3: domínio registrado e DNS apontando para o IP da VPS.  
Nos arquivos de configuração do D0.3, substituir todas as ocorrências de `seudominio.com.br` pelo domínio real registrado.
