# Dokploy Deployment Setup

## Prerequisites

- Dokploy instance running (self-hosted or managed)
- Git repository connected to Dokploy
- A PostgreSQL database (Dokploy managed or external)

## Services Overview

| Service | Dockerfile | Port | Notes |
|---------|-----------|------|-------|
| `fitsy-api` | `apps/api/Dockerfile` | 4000 | NestJS + Prisma; auto-migrates on start |
| `fitsy-web` | `apps/web/Dockerfile` | 3000 | Next.js standalone; `NEXT_PUBLIC_API_URL` is a **build ARG** |

## Option A: Docker Compose deployment

In Dokploy, create a **Docker Compose** project pointing to this repository.
Use `docker-compose.prod.yml` as the compose file.

Set the following environment variables in the Dokploy dashboard:

```
DATABASE_URL=postgresql://user:pass@host:5432/fitsy
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=https://your-api-domain.com
CORS_ORIGIN=https://your-web-domain.com
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

> **Important:** `NEXT_PUBLIC_API_URL` is used as a Docker **build argument** for the web service. It must be set before building — changing it requires a rebuild.

## Option B: Separate services

### fitsy-api

1. Create an **Application** in Dokploy
2. Source: this Git repository
3. Build settings:
   - Build type: **Dockerfile**
   - Dockerfile path: `apps/api/Dockerfile`
   - Build context: `.` (repo root)
4. Environment variables:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/fitsy
   BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
   BETTER_AUTH_URL=https://your-api-domain.com
   CORS_ORIGIN=https://your-web-domain.com
   PORT=4000
   ```
5. Port: `4000`

### fitsy-web

1. Create an **Application** in Dokploy
2. Source: this Git repository
3. Build settings:
   - Build type: **Dockerfile**
   - Dockerfile path: `apps/web/Dockerfile`
   - Build context: `.` (repo root)
   - Build arguments: `NEXT_PUBLIC_API_URL=https://your-api-domain.com`
4. Environment variables:
   ```
   PORT=3000
   HOSTNAME=0.0.0.0
   ```
5. Port: `3000`

## Database

Use Dokploy's built-in PostgreSQL service or an external managed database.

When creating the database, note the connection string format:
```
postgresql://<user>:<password>@<host>:<port>/<database>
```

The API automatically runs `prisma migrate deploy` on startup — no manual migration step needed.

## Domain Setup

Configure domains in Dokploy's domain settings:
- `fitsy-api` → `api.your-domain.com` (or subdomain)
- `fitsy-web` → `your-domain.com` (or subdomain)

Set `CORS_ORIGIN` in the API to match the web domain exactly.

## First Deploy Checklist

- [ ] PostgreSQL database created and connection string ready
- [ ] `BETTER_AUTH_SECRET` generated (`openssl rand -base64 32`)
- [ ] `BETTER_AUTH_URL` set to the public API URL
- [ ] `NEXT_PUBLIC_API_URL` set to the public API URL (build arg for web)
- [ ] `CORS_ORIGIN` set to the public web URL
- [ ] Domains configured in Dokploy
- [ ] Both services deployed and healthy
- [ ] Verify `/api/auth/sign-up/email` and `/api/auth/sign-in/email` work end-to-end
