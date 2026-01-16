# Rollback Procedure

This document describes how to rollback the LifeTracker application in case of deployment failures or critical bugs.

## Quick Rollback (Application Only)

For issues with application code (not database schema changes):

```bash
# SSH to the production server
ssh user@lifetracker.maverickapplications.com

# Navigate to the application directory
cd /opt/lifetracker

# View recent commits to find the good version
git log --oneline -10

# Checkout the previous working commit
git checkout <commit-hash>

# Rebuild and restart containers
docker compose up -d --build

# Verify the application is running
curl -f https://lifetracker.maverickapplications.com/health
```

## Database Rollback

### If Migration Failed Mid-Way

If a Prisma migration failed partway through:

```bash
cd packages/core

# Check migration status
bunx prisma migrate status

# Mark a failed migration as rolled back
bunx prisma migrate resolve --rolled-back <migration-name>

# Then manually reverse any partial changes in the database
```

### If Migration Succeeded But Needs Reverting

Prisma doesn't support automatic down migrations. For reversing a migration:

1. **Create a new migration** that undoes the changes:

```bash
# Manually edit schema.prisma to the previous state
# Then create a new migration
bunx prisma migrate dev --name rollback_<feature_name>
```

2. **Or restore from backup** (if available):

```bash
# Stop the application
docker compose stop api

# Restore database from backup
pg_restore -h localhost -p 5433 -U lifetracker -d lifetracker < backup.sql

# Restart the application
docker compose up -d api
```

## Emergency Procedures

### Complete Application Failure

If the entire application is down:

1. **Check container status:**
   ```bash
   docker compose ps
   docker compose logs api --tail 100
   docker compose logs web --tail 100
   ```

2. **Restart all services:**
   ```bash
   docker compose down
   docker compose up -d
   ```

3. **If database connection issues:**
   ```bash
   docker compose restart postgres
   sleep 10
   docker compose restart api
   ```

### Database Connection Lost

```bash
# Check postgres container
docker compose logs postgres --tail 50

# Restart postgres
docker compose restart postgres

# Wait for it to be ready
docker compose exec postgres pg_isready -U lifetracker

# Restart API
docker compose restart api
```

## Prevention Best Practices

1. **Always backup before deployment:**
   ```bash
   docker compose exec postgres pg_dump -U lifetracker lifetracker > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations on staging first** (when staging environment is available)

3. **Use CI/CD pipeline** - don't deploy manually

4. **Monitor the health endpoint** after every deployment

## GitHub Actions Rollback

If a deployment was triggered via GitHub Actions and you need to revert:

1. Go to the GitHub repository
2. Click "Actions" tab
3. Find the "Deploy" workflow
4. Click "Run workflow"
5. Select the `main` branch (or the branch with the known good code)

Alternatively, revert the problematic PR and deploy the revert commit.

## Contact

For critical production issues that cannot be resolved using this guide, escalate according to your team's incident response procedures.
