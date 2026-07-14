# GlobeTrail Deployment Guide

## Version

1.0

---

## Status

Draft

---

## Last Updated

2026-07-14

---

# 1. Deployment Philosophy

Development and production environments remain separate.

Production deployments must always originate from the main branch.

---

# 2. Development Environment

Technology

- Next.js
- Prisma
- MySQL
- Vertex AI
- Tailwind CSS

Local Services

- Local MySQL
- Local development server

---

# 3. Production Environment

Hosting

Google Cloud

Components

- Cloud Run
- Cloud SQL (MySQL)
- Vertex AI
- Secret Manager
- Cloud Logging

---

# 4. Deployment Architecture

```
Browser

↓

Cloud Run

↓

Next.js

↓

Prisma

↓

Cloud SQL

↓

Vertex AI

↓

REST Countries API

↓

OpenTripMap API
```

---

# 5. Environment Variables

Development

```
.env.local
```

Production

Managed using Google Secret Manager.

Never commit secrets.

---

# 6. Build Process

1. Install dependencies

2. Generate Prisma Client

3. Run database migrations

4. Build Next.js application

5. Deploy to Cloud Run

---

# 7. Database Deployment

Production database:

Cloud SQL MySQL

Migration Strategy

```
Prisma Migration

↓

Review

↓

Backup

↓

Deploy
```

Never modify production tables manually.

---

# 8. Monitoring

Monitor:

- Application logs
- AI failures
- API failures
- Database performance
- Response times

Use:

Google Cloud Logging

---

# 9. Backup Strategy

Back up:

- Database
- Prisma migrations
- Prompt files
- Configuration

Cloud SQL automated backups remain enabled.

---

# 10. Security

Production uses:

- HTTPS
- Secret Manager
- Environment variables
- IAM least privilege
- Server-side API keys

---

# 11. Deployment Checklist

Before deployment:

✓ Build succeeds

✓ TypeScript passes

✓ Lint passes

✓ Prisma migration succeeds

✓ Environment variables configured

✓ Secrets configured

✓ AI connectivity verified

✓ Production database reachable

---

# 12. Rollback Strategy

If deployment fails:

1. Roll back to previous Cloud Run revision.

2. Restore database backup if required.

3. Review logs.

4. Fix issue.

5. Redeploy.

---

# 13. Cost Monitoring

Monitor:

- Cloud Run usage
- Cloud SQL usage
- Vertex AI usage
- API quotas

Budget alerts should remain enabled.

---

# 14. Future Deployment Improvements

Possible future enhancements:

- CI/CD with GitHub Actions
- Automated deployments
- Staging environment
- Custom domain
- CDN integration
- Infrastructure as Code (Terraform)