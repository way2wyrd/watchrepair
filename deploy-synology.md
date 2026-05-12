# Deploying Fricking Watch Repair to Synology NAS (DSM 7)

## Prerequisites

1. **Container Manager** installed from Synology Package Center
2. **SSH access** enabled on your NAS (Control Panel > Terminal & SNMP > Enable SSH)
3. **Docker Compose** available (included with Container Manager)

## Step 1: Copy Project Files to NAS

Copy the entire WatchApp folder to your NAS. You can use:
- **File Station**: Upload to a shared folder (e.g., `/volume1/docker/watchapp/`)
- **SCP**: `scp -r ./WatchApp user@nas-ip:/volume1/docker/watchapp`
- **SMB**: Copy via network share

## Step 2: Prepare Persistent Data

SSH into your NAS and create the data directory:

```bash
ssh user@your-nas-ip
cd /volume1/docker/watchapp

# Create data directory
mkdir -p data/uploads data/manuals

# Copy your existing database
cp public/WatchRepair.db3 data/WatchRepair.db3
```

If you have existing uploads or manuals, copy those too:
```bash
cp -r uploads/* data/uploads/ 2>/dev/null
cp -r manuals/* data/manuals/ 2>/dev/null
```

## Step 3: Build and Start

```bash
cd /volume1/docker/watchapp

# Build and start the container
sudo docker-compose up -d --build
```

The app will be available at `http://your-nas-ip:8080`

## Step 4 (Optional): Set Up Reverse Proxy for HTTPS

In DSM:
1. Go to **Control Panel > Login Portal > Advanced > Reverse Proxy**
2. Click **Create**
3. Configure:
   - **Description**: Fricking Watch Repair
   - **Source Protocol**: HTTPS
   - **Source Hostname**: watch.yourdomain.com (or `*`)
   - **Source Port**: 443
   - **Destination Protocol**: HTTP
   - **Destination Hostname**: localhost
   - **Destination Port**: 8080
4. Under **Custom Header**, add:
   - `Upgrade` / `$http_upgrade`
   - `Connection` / `$connection_upgrade`

Then set up a certificate in **Control Panel > Security > Certificate** (Let's Encrypt works well).

## Updating the App

When you make changes to the code:

```bash
cd /volume1/docker/watchapp

# Pull latest files (or copy updated files)
# Then rebuild and restart:
sudo docker-compose up -d --build
```

Your data (database, uploads, manuals) persists in `./data/` and is not affected by rebuilds.

## Troubleshooting

**View logs:**
```bash
sudo docker-compose logs -f watchapp
```

**Restart the container:**
```bash
sudo docker-compose restart
```

**Stop the container:**
```bash
sudo docker-compose down
```

**Check container status:**
```bash
sudo docker-compose ps
```

**Port conflict:** If port 8080 is in use, change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "9090:3001"  # Change 8080 to any available port
```

## Alternative: Container Manager GUI

If you prefer not to use SSH:

1. Open **Container Manager** in DSM
2. Go to **Project** > **Create**
3. Set project name: `watchapp`
4. Set path: `/volume1/docker/watchapp`
5. It will detect the `docker-compose.yml` automatically
6. Click **Build** and **Start**

## Backup

Back up your data directory regularly:
```bash
# Database + all uploaded files
cp -r /volume1/docker/watchapp/data /volume1/backups/watchapp-$(date +%Y%m%d)
```
