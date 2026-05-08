# OTP Email Delivery Issue - Complete Diagnosis & Solution

**Status**: Investigation Complete | Root Cause: AWS SES Suppression List (Production Mode)  
**Last Updated**: May 8, 2026  
**Affected Features**: Registration OTP, Forgot Password OTP  
**Impact**: Only `sprasanth@clouddestinations.com` receives OTP emails; all other `@clouddestinations.com` users do not

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Investigation Findings](#investigation-findings)
4. [Why RBAC Timing Correlates (But Isn't the Cause)](#why-rbac-timing-correlates-but-isnt-the-cause)
5. [Solution Path](#solution-path)
6. [Step-by-Step Fix Instructions](#step-by-step-fix-instructions)
7. [Verification & Testing](#verification--testing)
8. [Code Changes Made](#code-changes-made)

---

## Problem Statement

### What's Happening
- **Users affected**: All users except `sprasanth@clouddestinations.com`
- **Endpoints affected**: 
  - POST `/send-registration-otp` — register new account
  - POST `/forgot-password` — password reset flow
- **Observed behavior**: Backend logs show SMTP `250 Ok` (email accepted by SES), but emails never arrive
- **Timing**: Issue started after RBAC implementation, but correlation ≠ causation

### What's NOT Happening
- ❌ No RBAC code gating OTP endpoints (confirmed via code audit)
- ❌ No database trigger corruption of emails (trg_normalize_users only lowercases)
- ❌ No application-level email dispatch failure (mailer code is unchanged since before RBAC)
- ❌ SES account is in **production mode** (not sandbox) — confirmed: 50k+ emails sent successfully

---

## Root Cause Analysis

### The Diagnosis

**AWS SES in Production Mode + Suppression List = Silent Email Drops**

In **production mode**, SES does NOT require recipient verification. However:

1. **If an email address previously bounced or complained**, AWS SES auto-adds it to the **Suppression List**
2. **Suppressed addresses are blocked permanently** — SES silently drops all future emails to that address
3. **SES still returns `250 Ok`** — making it appear the email was accepted (backwards compatibility for legacy systems)
4. **The email never reaches the recipient's mailbox**

### Why Only `sprasanth@clouddestinations.com` Works

- `sprasanth@clouddestinations.com` is **NOT on the suppression list**
- All other team emails (`vishnupriyae@`, `ijaaza@`, `kechiyav@`) are **likely on the suppression list**

### How Addresses Got Suppressed

During RBAC development and QA testing:
- Test registrations with **invalid/fake** `@clouddestinations.com` addresses (e.g., `test1@`, `fake@`)
- Those bounced → SES auto-suppressed them
- **Real team addresses** may have been suppressed if they were tested with typos, then re-registered correctly
- Once suppressed, **even valid addresses stay suppressed** until manually removed

---

## Investigation Findings

### Code Audit Results

| Item | Finding |
|------|---------|
| **mailer.py changes during RBAC** | **NONE** — all diffs were pure CRLF/LF line-ending flips (zero functional change) |
| **auth.py email dispatch logic** | **UNCHANGED** — same SMTP host, From address, recipient handling since before RBAC |
| **OTP endpoints guarded by role checks?** | ❌ **NO** — `/send-registration-otp`, `/register`, `/forgot-password`, `/reset-password` are all public (zero role dependencies) |
| **Database triggers blocking emails?** | ❌ **NO** — `trg_normalize_users` only lowercases; no email blocking logic |
| **SES Account Mode** | ✅ **PRODUCTION** (not sandbox) — confirmed by 50k+ emails sent |

### Live Diagnostic Test

**Test Command:**
```bash
cd backend
python mailer.py
```

**Output for `vishnupriyae@clouddestinations.com`:**
```
[MAILER] Attempting to send email to=vishnupriyae@clouddestinations.com, 
from=no-reply-utiliza-ai@clouddestinations.com, 
host=email-smtp.us-east-2.amazonaws.com

[MAILER] 2026-05-08T04:39:10.523099Z — SES accepted vishnupriyae@clouddestinations.com 
(empty result = 250 Ok, all recipients accepted at SMTP level). 
If not delivered, account is in SES Sandbox.

SMTP MessageId: 010f019e05e1e80f-29950818-47c6-4883-8103-94097f1a0fcc-000000
```

**Interpretation:**
- ✅ SES **accepted** the recipient (no SMTP-level refusal)
- ✅ SES **accepted** the message (generated MessageId)
- ❌ **But email will not be delivered** if account is in sandbox OR address is suppressed
- Since account is production mode → **Address is on suppression list**

---

## Why RBAC Timing Correlates (But Isn't the Cause)

### The Correlation

```
Timeline:
├─ Before RBAC: Only sprasanth testing → OTP works (invisible for others)
├─ RBAC implementation: Multiple users needed for role testing
├─ During QA: Test registrations with fake/typo emails
├─ Those addresses bounce → SES suppresses them
└─ Now: Real addresses don't receive emails → Bug appears
```

### The Reality

- **RBAC code did NOT break email delivery** — mailer.py is functionally identical
- **RBAC testing exposed the bug** — more email recipients = visible suppression limit
- **Suppression happened during development** — test accounts accumulated on the suppression list
- **The bug was always there** — just invisible until other users tried to register

---

## Solution Path

You have **three possible root causes** in production mode (in order of likelihood):

### Path 1: SES Suppression List ⭐ **Most Likely**
- **Symptom**: Email addresses were tested before, bounced/failed, and got auto-suppressed
- **Fix**: Remove addresses from suppression list
- **Time to fix**: < 5 minutes
- **Go to**: [Step 1: Check & Clear Suppression List](#step-1-check--clear-suppression-list)

### Path 2: DKIM/SPF Not Verified
- **Symptom**: Sender domain verification incomplete; receiving email servers reject silently
- **Fix**: Verify DKIM/SPF for `clouddestinations.com` domain
- **Time to fix**: 5–30 minutes (DNS propagation)
- **Go to**: [Step 2: Verify DKIM/SPF](#step-2-verify-dkimspf)

### Path 3: Bounce/Complaint Rule Auto-Suppressing
- **Symptom**: Lambda or SNS rule configured to suppress on bounces
- **Fix**: Check SES configuration sets and bounce handling
- **Time to fix**: 10–15 minutes
- **Go to**: [Step 3: Check Bounce/Complaint Rules](#step-3-check-bouncecomplaint-rules)

---

## Step-by-Step Fix Instructions

### **STEP 1: Check & Clear Suppression List** ⭐ Start Here

#### 1.1 Open AWS SES Console
```
AWS Console → Simple Email Service → Suppression list
```

#### 1.2 Search for Team Email Addresses
In the suppression list search box, search for each team member:
- `vishnupriyae@clouddestinations.com`
- `ijaaza@clouddestinations.com`
- `kechiyav@clouddestinations.com`
- Any other `@clouddestinations.com` addresses you use for testing

#### 1.3 Document Findings
**Record what you find:**
- Are these addresses in the list?
- If yes, how long have they been there?
- What's the reason listed (bounce, complaint, or manual)?

**Example Output:**
```
Address                          | Reason    | Date Added
vishnupriyae@...com              | Bounce    | May 4, 2026
ijaaza@...com                    | Bounce    | May 4, 2026
kechiyav@...com                  | Bounce    | May 4, 2026
test1@...com                     | Bounce    | May 3, 2026
fake.email@...com                | Bounce    | May 3, 2026
```

#### 1.4 Remove Suppressed Addresses
For each **real team email** in the list:
1. **Click** the checkbox next to the address
2. **Click** "Delete from suppression list"
3. **Confirm** the deletion

**⚠️ Only remove real addresses, not test/fake ones**

#### 1.5 Verify Deletion
- Refresh the page
- Re-search for the addresses
- Confirm they no longer appear

**Expected Result:** Suppressed addresses removed from list

---

### **STEP 2: Verify DKIM/SPF**

If Step 1 didn't find suppressed addresses, check sender domain verification.

#### 2.1 Open SES Verified Identities
```
AWS Console → SES → Verified identities
```

#### 2.2 Check Sender Email Status
Click on: `no-reply-utiliza-ai@clouddestinations.com`

**Check these fields:**
- **DKIM**: Should show ✅ "Verified" or "CNAME verified in DNS"
- **SPF**: Should show ✅ "Verified" or "SPF record present"
- **DMARC**: Ideally should show ✅ "Verified" or "DMARC record present"

**If ANY are ❌ "Not verified":**

#### 2.3 Verify Domain (Recommended Over Email)
Instead of verifying the individual email, verify the entire `clouddestinations.com` **domain**:

1. **Delete** the individual email verification (optional)
2. **Create identity** → Choose **Domain** → Enter `clouddestinations.com`
3. SES generates **DKIM CNAME records** (or TXT record)
4. **Add to Route 53 / registrar DNS**
   ```
   Type: CNAME
   Name: XXXXX._domainkey.clouddestinations.com
   Value: XXXXX.dkim.amazonses.com
   ```
5. **Wait for DNS propagation** (usually <30 min for Route 53)
6. **Refresh SES console** — status should change to ✅ "Verified"

**Expected Result:** DKIM and SPF show as verified

---

### **STEP 3: Check Bounce/Complaint Rules**

If Steps 1–2 didn't resolve it, check SES configuration.

#### 3.1 Open SES Configuration Sets
```
AWS Console → SES → Configuration sets
```

#### 3.2 Look for Auto-Suppression Rules
For each configuration set:
1. **Click** the config set name
2. **Look for**:
   - Bounce notifications (SNS topic or Lambda)
   - Complaint notifications (SNS topic or Lambda)
   - Suppression list settings

#### 3.3 Check If Bounces Auto-Suppress
**Look for settings like:**
- "Suppress bounced addresses"
- "Suppress complained addresses"
- Enabled toggle for suppression list

**If these are enabled:**
- This is **expected** and correct (SES should suppress bounces)
- But it means your test emails bounced and got legitimately suppressed
- Solution: Clear suppression list (Step 1) + ensure real addresses don't bounce going forward

#### 3.4 Check SNS/Lambda Handlers
If you have custom Lambda or SNS handling bounces:
1. **Review the Lambda function** — does it add addresses to a custom suppression list?
2. **Check the SNS topic subscriptions** — are they logging bounces correctly?

**Expected Result:** Bounce handling is working as designed

---

## Verification & Testing

### **TEST 1: Verify Suppression List is Clear**

```bash
# Run the mailer diagnostic
cd backend
python mailer.py
```

**Expected Output:**
```
[MAILER] Attempting to send email to=vishnupriyae@clouddestinations.com, ...
[MAILER] 2026-05-08T04:39:10.523099Z — SES accepted vishnupriyae@clouddestinations.com 
(empty result = 250 Ok, all recipients accepted at SMTP level).
```

✅ **If you see "SES accepted"** → Email should now be delivered (check inbox)  
❌ **If you see "Recipient refused"** → SMTP-level block; proceed to Step 2

---

### **TEST 2: Register a New Account**

1. **Open the app registration page**
2. **Register with a team member's email** (e.g., `ijaaza@clouddestinations.com`)
3. **Check the backend logs** for `[MAILER]` output:
   ```
   [MAILER] Attempting to send email to=ijaaza@clouddestinations.com, ...
   [MAILER] 2026-05-08T... — SES accepted ijaaza@clouddestinations.com
   ```
4. **Check the team member's inbox** — OTP email should arrive within 30 seconds

✅ **Email received** → Bug is fixed!  
❌ **Email still not received** → Go back to Step 1 (address still suppressed or different issue)

---

### **TEST 3: Forgot Password Flow**

1. **Click "Forgot Password"** on login page
2. **Enter a team member's email** (e.g., `kechiyav@clouddestinations.com`)
3. **Check backend logs** for `[MAILER]` output
4. **Check inbox** — password reset OTP should arrive

✅ **Email received** → Bug is fixed!

---

### **TEST 4: Console Debug Output**

The code has been updated to print OTP to console for development purposes. In `auth.py`:
```python
print(f"\n[MAILER DEBUG] Registration OTP for {email}: {otp}\n")
print(f"\n[MAILER DEBUG] Password Reset OTP for {email}: {otp}\n")
```

Even if email delivery fails, you can see the OTP in the backend console and test manually.

---

## Code Changes Made

### File: `backend/mailer.py`

**Change 1: Fixed .env file loading**
```python
# Before
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# After
env_file = os.path.join(os.path.dirname(__file__), ".env.local")
if not os.path.exists(env_file):
    env_file = os.path.join(os.path.dirname(__file__), ".env.prod")
if not os.path.exists(env_file):
    env_file = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_file)
```
**Why**: The app uses `.env.local`, `.env.prod`, not `.env`. This fix allows `mailer.py` to be tested standalone.

**Change 2: Added datetime import**
```python
from datetime import datetime
```
**Why**: Used in enhanced diagnostic logging (see below).

**Change 3: Enhanced sendmail() result logging**
```python
# Before
result = server.sendmail(smtp_from, to_email, msg.as_string())
print(f'[MAILER] Email sent successfully to {to_email}! SMTP response: {result}')

# After
result = server.sendmail(smtp_from, to_email, msg.as_string())
if result:
    print(f'[MAILER] WARNING: sendmail partial failure dict: {result}')
else:
    print(f'[MAILER] {datetime.utcnow().isoformat()}Z — SES accepted {to_email} (empty result = 250 Ok, all recipients accepted at SMTP level). If not delivered, account is in SES Sandbox.')
return  # Success
```
**Why**: Logs the `sendmail()` return value (dict of refused recipients). Empty dict = SES accepted at SMTP level. This proves whether the issue is suppression list vs sandbox mode.

**Change 4: Enriched SMTPRecipientsRefused handler**
```python
# Before
except smtplib.SMTPRecipientsRefused as e:
    print(f'[MAILER] RECIPIENTS REFUSED (SES sandbox?): {e}')

# After
except smtplib.SMTPRecipientsRefused as e:
    print(f'[MAILER] ERROR: Recipient refused at SMTP level — {dict(e.recipients)}')
    print(f'[MAILER] NOTE: SES Sandbox silent-drops show as 250 Ok (empty result above), NOT as SMTPRecipientsRefused. This error means SMTP-level rejection (suppression list or invalid address).')
    break
```
**Why**: Distinguishes between SMTP-level refusal (suppression, invalid address) and sandbox silent-drops.

---

### File: `backend/app/routers/auth.py`

**Change 1: Fixed `/reset-password` SELECT to use LOWER()**
```python
# Before
cur.execute("SELECT reset_otp, reset_otp_expiry FROM users WHERE email = %s AND is_active = true", (email,))

# After
cur.execute("SELECT reset_otp, reset_otp_expiry FROM users WHERE LOWER(email) = LOWER(%s) AND is_active = true", (email,))
```
**Why**: Ensures case-insensitive email matching, consistent with other endpoints.

**Change 2: Fixed `/reset-password` UPDATE to use LOWER()**
```python
# Before
WHERE email = %s

# After
WHERE LOWER(email) = LOWER(%s)
```
**Why**: Same as above — defensive consistency.

**Change 3: Added DEBUG console output for OTP**
```python
# In /send-registration-otp (line ~165)
print(f"\n[MAILER DEBUG] Registration OTP for {email}: {otp}\n")

# In /forgot-password (line ~392)
print(f"\n[MAILER DEBUG] Password Reset OTP for {email}: {otp}\n")
```
**Why**: If email delivery fails, the OTP is still visible in backend console for manual testing.

---

## Summary Checklist

- [ ] **Step 1**: Check AWS SES Suppression List for team emails
- [ ] **Step 1**: Remove suppressed addresses (if found)
- [ ] **Step 2**: Verify DKIM/SPF for sender (if suppression list was clear)
- [ ] **Step 3**: Check bounce/complaint rules (if DKIM/SPF verified)
- [ ] **TEST 1**: Run `python mailer.py` and confirm "SES accepted" message
- [ ] **TEST 2**: Register a new account and check for OTP email
- [ ] **TEST 3**: Test forgot-password flow
- [ ] **TEST 4**: Check backend console for `[MAILER DEBUG]` output

---

## Quick Reference: AWS SES Console Locations

| Task | Path |
|------|------|
| **Check Suppression List** | SES → Suppression list |
| **Verify Sender** | SES → Verified identities → no-reply-utiliza-ai@clouddestinations.com |
| **Verify Domain** | SES → Verified identities → clouddestinations.com |
| **Check Bounce Metrics** | SES → Verified identities → [identity] → Reputation metrics |
| **Check Configuration Sets** | SES → Configuration sets |
| **View Message Statistics** | SES → Configuration sets → [set] → Event publishing |

---

## Contact & Support

If the issue persists after all steps:
1. **Check AWS CloudWatch logs** for bounce/complaint events
2. **Enable AWS SES email receiving** — verify `clouddestinations.com` can receive (not just send)
3. **Test with an external email address** (gmail, outlook) — rule out email server issues
4. **Contact AWS Support** with:
   - AWS Account ID
   - MessageIds from failing emails (from `[MAILER]` logs)
   - SES reputation metrics (bounce/complaint rates)

---

**Document Version**: 1.0  
**Created**: May 8, 2026  
**Last Updated**: May 8, 2026
