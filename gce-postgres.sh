#!/bin/bash
# GCE e2-micro PostgreSQL 一键初始化脚本
# 在 GCE 虚拟机上以 root 或 sudo 运行
# 前提：已创建 e2-micro VM 并挂载了一块 30GB 持久磁盘（通常为 /dev/sdb）

set -e

DISK_DEVICE="${1:-/dev/sdb}"
MOUNT_DIR="/data"
PG_DATA="$MOUNT_DIR/postgres"
PG_USER="amimind"
PG_PASSWORD="$(openssl rand -base64 20 | tr -dc 'A-Za-z0-9' | head -c 24)"
PG_DB="amimind"
PG_PORT="5432"

echo "=== [1/5] 格式化并挂载持久磁盘 $DISK_DEVICE ==="
if ! blkid "$DISK_DEVICE" | grep -q ext4; then
  mkfs.ext4 -F "$DISK_DEVICE"
fi
mkdir -p "$MOUNT_DIR"
mount "$DISK_DEVICE" "$MOUNT_DIR" 2>/dev/null || true

# 写入 fstab 保证重启自动挂载
UUID=$(blkid -s UUID -o value "$DISK_DEVICE")
if ! grep -q "$UUID" /etc/fstab; then
  echo "UUID=$UUID $MOUNT_DIR ext4 defaults,nofail 0 2" >> /etc/fstab
fi
echo "磁盘已挂载到 $MOUNT_DIR"

echo "=== [2/5] 安装 Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi
echo "Docker 就绪"

echo "=== [3/5] 创建 PostgreSQL 数据目录 ==="
mkdir -p "$PG_DATA"

echo "=== [4/5] 启动 PostgreSQL 容器 ==="
docker rm -f amimind-postgres 2>/dev/null || true

docker run -d \
  --name amimind-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASSWORD" \
  -e POSTGRES_DB="$PG_DB" \
  -v "$PG_DATA":/var/lib/postgresql/data \
  -p "$PG_PORT":5432 \
  postgres:16-alpine

echo "等待 PostgreSQL 启动..."
sleep 8
docker exec amimind-postgres pg_isready -U "$PG_USER" -d "$PG_DB"

echo "=== [5/5] 完成 ==="
EXTERNAL_IP=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" -H "Metadata-Flavor: Google" 2>/dev/null || echo "<YOUR_GCE_IP>")

echo ""
echo "=========================================="
echo "PostgreSQL 部署完成！"
echo ""
echo "在 HF Spaces Settings → Secrets 中设置："
echo ""
echo "  DATABASE_URL=postgresql://$PG_USER:$PG_PASSWORD@$EXTERNAL_IP:$PG_PORT/$PG_DB"
echo ""
echo "记得在 GCP 防火墙开放 TCP 5432 端口（来源 0.0.0.0/0）"
echo "=========================================="
