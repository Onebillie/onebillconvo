# VirusTotal Malware Scanning Setup

## CRITICAL: Enable Malware Protection

Your system currently accepts all file uploads without scanning. This is a **HIGH SECURITY RISK**. Follow these steps to enable protection:

### Why This Is Important
Messaging platforms are frequent targets for malware attacks:
- Customers may unknowingly upload infected files
- Malware can spread to staff and other customers
- Reputation damage if your system distributes malware
- Legal liability for data breaches

### Option A: VirusTotal Integration (Recommended)

#### Benefits
✅ Scans with 70+ antivirus engines
✅ Instant reputation check for known files
✅ Free tier available (500 requests/day)
✅ No infrastructure maintenance

#### Setup Steps

1. **Create VirusTotal Account**
   - Go to [VirusTotal](https://www.virustotal.com/gui/join-us)
   - Sign up for a free account
   - Verify your email

2. **Get API Key**
   - Go to [API Key Page](https://www.virustotal.com/gui/user/YOUR_USERNAME/apikey)
   - Copy your API key

3. **Add to Supabase**
   - Go to [Supabase Functions Secrets](https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/settings/functions)
   - Add new secret:
     - Name: `VIRUSTOTAL_API_KEY`
     - Value: (paste your API key)
   - Click **Save**

4. **Enable Scanning**
   The `scan-attachment` edge function is already created and will automatically start using VirusTotal once the API key is added.

#### How It Works
```
User uploads file → Scan with VirusTotal → Check results → Accept/Reject
```

- **Known clean files**: Instant approval
- **Known malware**: Instant rejection
- **Unknown files**: Uploaded to VT for analysis, marked for re-check
- **Suspicious extensions**: Blocked (.exe, .bat, .cmd, .scr, .pif, .vbs, .js)

#### API Limits
- **Free Tier**: 500 requests/day, 4 requests/minute
- **Premium**: $500/month for 1M requests/month
- Monitor usage in VirusTotal dashboard

### Option B: ClamAV Integration (Self-Hosted)

#### Benefits
✅ Free and open source
✅ No API limits
✅ Full control

#### Drawbacks
❌ Requires server infrastructure
❌ Resource intensive
❌ Manual signature updates
❌ Slower than VirusTotal

#### Setup (If Chosen)
Would require:
1. Deploy ClamAV server
2. Create edge function to call ClamAV
3. Maintain virus signature updates
4. Monitor server health

**Recommendation**: Start with VirusTotal free tier, upgrade if needed.

### Option C: AWS S3 Malware Protection

#### Benefits
✅ Integrated with AWS ecosystem
✅ Automatic scanning

#### Drawbacks
❌ Requires migrating from Supabase Storage to S3
❌ Additional AWS costs (~$0.50 per GB scanned)
❌ More complex setup

### Current Protection (Basic)

Even without VirusTotal, the system has basic protection:

✅ **File Extension Blocking**
- Blocks dangerous extensions: .exe, .bat, .cmd, .scr, .pif, .vbs, .js

✅ **Security Logging**
- All file uploads logged to `security_logs` table
- Tracks file hashes, customer IDs, timestamps

✅ **Manual Review**
- Admin can review security logs in superadmin dashboard

### Implementation Status

| Feature | Status |
|---------|--------|
| scan-attachment edge function | ✅ Created |
| VirusTotal integration | ⚠️ Needs API key |
| Extension blocking | ✅ Active |
| Security logging | ✅ Active |
| Quarantine bucket | ⏳ Not implemented |

### Next Steps (After Adding API Key)

1. **Test Scanning**
   - Upload EICAR test file: `X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`
   - Should be detected and rejected

2. **Monitor Security Logs**
   ```sql
   SELECT * FROM security_logs 
   WHERE event_type IN ('malware_detected', 'suspicious_file_type')
   ORDER BY created_at DESC;
   ```

3. **Add Quarantine Flow** (Future Enhancement)
   - Create `customer_media_quarantine` bucket
   - Move suspicious files to quarantine
   - Admin review before deletion

4. **Customer Notifications**
   - Notify customers when file is rejected
   - Provide alternative upload methods
   - Educate on safe file practices

### Security Checklist

- [ ] VirusTotal API key added to Supabase
- [ ] Test file scan with EICAR test file
- [ ] Verify security logs are recording scans
- [ ] Monitor false positive rate
- [ ] Set up alerts for malware detection
- [ ] Document customer notification process
- [ ] Train staff on handling malware incidents

### Cost Estimation

**Free Tier (500 requests/day)**
- Suitable for: <500 file uploads/day
- Cost: $0

**Premium ($500/month)**
- Suitable for: High-volume businesses
- Cost: $500/month
- Includes: 1M API requests

**Typical Usage**
- Small business (10 customers/day, 2 files each): 600 requests/month
- Medium business (50 customers/day, 3 files each): 4,500 requests/month
- Large business (200 customers/day, 2 files each): 12,000 requests/month

### Support Resources

- [VirusTotal API Documentation](https://developers.virustotal.com/reference/overview)
- [Edge Function Logs](https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/functions/scan-attachment/logs)
- [Security Best Practices](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)

### Urgent Action Required

⚠️ **This is a P0 blocker for production launch**

Without malware scanning:
- System is vulnerable to attacks
- Cannot guarantee customer data safety
- Potential legal liability
- Reputational risk

**Estimated setup time**: 15 minutes
**Priority**: CRITICAL
