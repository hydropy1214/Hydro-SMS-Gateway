# HYDROPY on Ubuntu — Setup Guide

Run the full HYDROPY SMS Gateway Platform on any Ubuntu 22.04+ server (VPS, bare metal, or local machine).

---

## Prerequisites

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 1 — Clone and install

```bash
git clone https://github.com/YOUR_ORG/hydropy.git
cd hydropy
pnpm install
```

---

## 2 — Create the database

```bash
sudo -u postgres psql -c "CREATE USER hydropy WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE hydropy OWNER hydropy;"
```

---

## 3 — Configure environment

```bash
cp .env.example .env
nano .env   # fill in DATABASE_URL and SERVER_URL
```

**Minimum required values:**

| Variable       | Example value                                      |
|----------------|----------------------------------------------------|
| `DATABASE_URL` | `postgresql://hydropy:yourpassword@localhost:5432/hydropy` |
| `SERVER_URL`   | `http://192.168.1.100:8080` or `https://yourdomain.com` |
| `PORT`         | `8080` (optional, defaults to 8080)                |

Export the variables in your shell (or use a process manager like PM2 that loads `.env`):

```bash
set -a; source .env; set +a
```

---

## 4 — Push the schema and seed default users

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
```

Default accounts after seeding:

| Role     | Email                | Password    |
|----------|----------------------|-------------|
| Admin    | admin@hydropy.io     | admin123    |
| Operator | operator@hydropy.io  | operator123 |

**Change these passwords immediately after first login.**

---

## 5 — Start the API server

```bash
pnpm --filter @workspace/api-server run dev
# or for production:
pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run start
```

The API listens on `http://0.0.0.0:8080` by default.

---

## 6 — Start the dashboard

```bash
pnpm --filter @workspace/hydropy-dashboard run dev
```

The dashboard dev server runs on port 5173 by default. Set `HOST=0.0.0.0` to allow access from other machines:

```bash
HOST=0.0.0.0 pnpm --filter @workspace/hydropy-dashboard run dev
```

Then open `http://YOUR_SERVER_IP:5173` in your browser.

---

## 7 — Connect the Android gateway app

1. Install **Expo Go** on your Android phone from the Play Store
2. Open it and scan the QR code shown by the Expo dev server (or use the HYDROPY Gateway preview URL)
3. In the HYDROPY dashboard, go to **Devices → PROVISION NODE**, enter a name, click **Generate QR**
4. In the Gateway app, tap **SCAN QR** and point the camera at the QR code
5. The device goes **ONLINE** — done!

**For LAN connections:** Your phone and server must be on the same Wi-Fi network, OR the server must be reachable from the internet with a public IP/domain.

---

## 8 — Production with PM2

```bash
npm install -g pm2

# Start API server
pm2 start --name hydropy-api "pnpm --filter @workspace/api-server run start" --cwd /path/to/hydropy

# Start dashboard (build first for production)
pnpm --filter @workspace/hydropy-dashboard run build
pm2 start --name hydropy-dash "npx serve dist -p 4173" --cwd /path/to/hydropy/artifacts/hydropy-dashboard

pm2 save
pm2 startup   # follow the printed command to enable auto-start on boot
```

---

## Firewall

```bash
# Allow API and dashboard ports
sudo ufw allow 8080/tcp
sudo ufw allow 4173/tcp   # or 80/443 if using a reverse proxy
sudo ufw enable
```

---

## Nginx reverse proxy (optional, for HTTPS)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://localhost:4173;
        proxy_set_header Host $host;
    }
}
```

Then use Certbot for free HTTPS: `sudo certbot --nginx -d yourdomain.com`

After enabling HTTPS, update `SERVER_URL=https://yourdomain.com` in `.env` and restart the API server so QR codes encode the correct wss:// URL.
