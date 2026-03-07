---
name: azure-deployment
description: Azure SWA + Container Apps deployment workflows
allowed-tools: [Bash, Read]
---

# Azure Deployment

Deployment guide for Azure Static Web Apps (frontend) and Container Apps (backend).

## When to Use

- Deploy frontend to Azure Static Web Apps
- Deploy backend to Azure Container Apps
- Troubleshoot deployment issues (API returning HTML, 404s, modal bugs)
- Configure staticwebapp.config.json

## Architecture

```yaml
Frontend: Azure Static Web Apps (SWA) | Next.js static export
Backend: Azure Container Apps | FastAPI/Python | Docker
Pattern: Develop local → Build → Deploy | Test locally first
```

## Environment Files (CRITICAL)

```yaml
.env.local: Local dev only | Empty NEXT_PUBLIC_API_URL → localhost
.env.production: Prod API URLs | Used during `npm run build`

WARNING: .env.local OVERRIDES .env.production during build
FIX: Move .env.local before prod build | Restore after
```

## Frontend Deploy Workflow

```bash
# 1. Temp remove local env (CRITICAL - prevents .env.local override)
mv .env.local .env.local.bak

# 2. Build (now uses .env.production)
npm run build

# 3. Restore for dev
mv .env.local.bak .env.local

# 4. Include SWA config
cp staticwebapp.config.json out/

# 5. Deploy
npx @azure/static-web-apps-cli deploy out --deployment-token "..." --env production

# NOTE: Use @azure/static-web-apps-cli NOT "swa" (wrong package)
```

## Backend Deploy Workflow (Container Apps)

```bash
# 1. Build image
docker build -t <acr>.azurecr.io/backend:latest .

# 2. Push to ACR
docker push <acr>.azurecr.io/backend:latest

# 3. Update container app
az containerapp update --name <app> --image <acr>.azurecr.io/backend:latest
```

## SWA Config (staticwebapp.config.json)

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/_next/static/*", "/favicon.ico"]
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

**Notes:**
- Exclude `/_next/static/*` NOT `/_next/*`
- Encoding: UTF-8 no BOM
- Remove BOM: `sed -i '1s/^\xef\xbb\xbf//' staticwebapp.config.json`

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| API returns HTML instead of JSON | Empty NEXT_PUBLIC_API_URL (.env.local override) | Build without .env.local present |
| Dialog/Modal won't close (Radix UI + React 19) | Radix UI 1.1.x incompatible w/ React 19 static export | Replace DialogPrimitive.Close w/ plain `<button onClick={...}>` |
| 404 for /_next/*.txt or RSC files | SWA excludes wrong paths | Exclude `/_next/static/*` not `/_next/*` |
| BOM character in JSON config | Windows encoding | `sed -i '1s/^\xef\xbb\xbf//' staticwebapp.config.json` |

## Verification Checklist

### Before Deploy
- [ ] .env.local moved/renamed
- [ ] `npm run build` succeeds
- [ ] `grep "prod-api-url" out/_next/static/chunks/*.js` confirms URL
- [ ] staticwebapp.config.json copied to out/

### After Deploy
- [ ] Clear browser cache + hard reload
- [ ] Check Network tab for correct API URL
- [ ] Test all CRUD operations
- [ ] Verify modals/dialogs close properly

## Example: agent-arch Resources

```yaml
# Frontend SWA
URL: witty-coast-0e5f72203.3.azurestaticapps.net
Name: agent-arch-web-prod
RG: rg-agent-architecture

# Backend API
URL: agent-arch-api.icyplant-75ca2495.westeurope.azurecontainerapps.io
Name: agent-arch-api
RG: rg-agent-architecture

# Container Registry
ACR: agentarchacr.azurecr.io (NOT agentarchprodacr)
Login: az acr login --name agentarchacr

# Get Deploy Token
az staticwebapp secrets list --name agent-arch-web-prod --query "properties.apiKey" -o tsv
```
