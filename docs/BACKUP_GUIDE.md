# MongoDB Atlas Backup Configuration Guide

## Automatic Backups Setup

### Step 1: Enable Cloud Backup

1. **Log in to MongoDB Atlas**
   - Go to https://cloud.mongodb.com
   - Navigate to your cluster

2. **Enable Backup**
   - Click on your cluster name
   - Go to "Backup" tab
   - Click "Enable Cloud Backup"
   - Choose backup policy:
     - **Free Tier**: Basic snapshots (limited)
     - **Paid Tier**: Continuous backup with point-in-time recovery

### Step 2: Configure Backup Policy

**Recommended Settings:**

```
Snapshot Frequency: Every 6 hours
Snapshot Retention: 7 days (free tier) or 30+ days (paid)
Point-in-Time Recovery: Enable (paid tier only)
```

### Step 3: Set Up Backup Alerts

1. Go to "Alerts" in Atlas
2. Add alert for "Backup Failure"
3. Configure notification email

## Backup Verification

### Monthly Backup Test Checklist

- [ ] Verify backup snapshots exist
- [ ] Test restore to dev environment
- [ ] Verify data integrity after restore
- [ ] Document restore time
- [ ] Update backup documentation

## Manual Backup (Alternative)

### Using mongodump

```bash
# Install MongoDB tools
# Windows: Download from MongoDB website
# Mac: brew install mongodb-database-tools
# Linux: apt-get install mongodb-database-tools

# Create backup
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/srep" --out=./backup

# Restore backup
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/srep" ./backup/srep
```

### Automated Backup Script

Create `scripts/backup-db.sh`:

```bash
#!/bin/bash
# MongoDB Backup Script

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="./backups/$DATE"
MONGODB_URI="your_mongodb_uri"

echo "Starting backup: $DATE"
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "Backup completed: $BACKUP_DIR.tar.gz"

# Keep only last 7 backups
ls -t ./backups/*.tar.gz | tail -n +8 | xargs rm -f
```

Make it executable:
```bash
chmod +x scripts/backup-db.sh
```

Schedule with cron (Linux/Mac):
```bash
# Edit crontab
crontab -e

# Add line to run daily at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh
```

Schedule with Task Scheduler (Windows):
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Action: Run PowerShell script

## Backup to Cloud Storage

### AWS S3 Backup

```bash
# Install AWS CLI
# Windows: Download from AWS website
# Mac: brew install awscli
# Linux: apt-get install awscli

# Configure AWS
aws configure

# Backup script with S3 upload
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="backup-$DATE.tar.gz"

mongodump --uri="$MONGODB_URI" --gzip --archive=$BACKUP_FILE
aws s3 cp $BACKUP_FILE s3://your-bucket/backups/
rm $BACKUP_FILE
```

### Google Cloud Storage Backup

```bash
# Install gsutil
curl https://sdk.cloud.google.com | bash

# Upload to GCS
gsutil cp backup.tar.gz gs://your-bucket/backups/
```

## Disaster Recovery Plan

### 1. Identify Issue
- Database corruption
- Data loss
- Accidental deletion

### 2. Select Restore Point
- Choose backup snapshot
- Verify timestamp

### 3. Restore Process

**Option A: Restore to New Cluster**
1. Create new MongoDB cluster
2. Restore backup to new cluster
3. Verify data integrity
4. Update application connection string
5. Test application

**Option B: Restore to Existing Cluster**
1. Stop application
2. Create backup of current state
3. Restore from backup snapshot
4. Verify data integrity
5. Restart application

### 4. Verify Recovery
- [ ] All collections present
- [ ] Record counts match
- [ ] Application functions correctly
- [ ] Users can access data

## Backup Checklist

### Daily
- [x] Automatic backups enabled
- [x] Backup alerts configured

### Weekly
- [ ] Verify recent backups exist
- [ ] Check backup size trends

### Monthly
- [ ] Test restore procedure
- [ ] Review backup retention policy
- [ ] Document any issues

### Quarterly
- [ ] Full disaster recovery drill
- [ ] Update documentation
- [ ] Review backup costs

## Important Notes

⚠️ **Never delete old backups until new ones are verified!**

⚠️ **Test your restore process regularly!**

⚠️ **Keep backup credentials secure and separate from production!**

✅ **Document your restore procedure step-by-step!**

## Cost Optimization

### Free Tier
- Basic snapshots every 12-24 hours
- 2-7 day retention
- Suitable for development/testing

### Paid Tier
- Continuous backup
- Point-in-time recovery
- 30+ day retention
- ~$0.20/GB/month

### Self-Managed Alternative
- Use mongodump + cloud storage
- Much cheaper (~$0.02/GB/month on S3)
- Requires manual setup and monitoring

## Backup Storage Estimates

| Data Size | Monthly Backup Size | S3 Cost (approx) | Atlas Cost (approx) |
|-----------|-------------------|-----------------|---------------------|
| 1 GB | ~3 GB (3x daily) | $0.06 | $0.60 |
| 10 GB | ~30 GB | $0.60 | $6.00 |
| 100 GB | ~300 GB | $6.00 | $60.00 |

## Recovery Time Objectives (RTO)

| Backup Method | Typical RTO | Complexity |
|---------------|-------------|------------|
| Atlas Snapshot | 15-30 min | Low |
| mongodump restore | 30-60 min | Medium |
| Point-in-time | 10-20 min | Low |
| Manual process | 1-2 hours | High |

## Support Contacts

- MongoDB Atlas Support: https://support.mongodb.com
- Emergency: Create urgent support ticket
- Community: https://community.mongodb.com

---

**Last Updated:** December 15, 2025  
**Review Schedule:** Quarterly  
**Next Review:** March 15, 2026
