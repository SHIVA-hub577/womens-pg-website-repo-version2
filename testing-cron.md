# Testing Guide: Automated Monthly Rent Reminder System

This guide outlines how to configure, test locally (Postman / cURL), test in production, and schedule an automated monthly rent reminder cron job using **Google Cloud Scheduler**.

---

## 1. Environment Configuration

Ensure the following variables are present in your `.env` file (and in your cloud hosting provider's environment variables):

```env
CRON_SECRET=womens_pg_cron_secret_key_2026
ADMIN_EMAIL=admin@pujyasrithasliving.com
```

---

## 2. Local Testing Guide (Before Deploying)

### Prerequisites:
- Server running locally on `http://localhost:3000` (e.g., `npm start` or `node app.js`).
- Database populated with room & tenant data.

---

### Test Case 1: Missing or Invalid API Key (Unauthorized)
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/send-rent-reminders`
- **Headers**:
  - `x-api-key`: `invalid_key_or_empty`
- **Expected Status Code**: `401 Unauthorized`
- **Expected Response Body**:
  ```text
  Unauthorized
  ```

---

### Test Case 2: Call on Non-Last Day of Month (Without `test` flag)
*Note: If today is not the last day of the month (e.g., today is the 15th or 25th), the endpoint will evaluate the date check.*

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/send-rent-reminders`
- **Headers**:
  - `x-api-key`: `womens_pg_cron_secret_key_2026`
- **Expected Status Code**: `200 OK`
- **Expected Response Body**:
  ```text
  Not last day
  ```

---

### Test Case 3: Force Execution (Local Testing with `test=true`)
*Bypasses the date check to verify email dispatch, database updates, and notification logging immediately.*

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/send-rent-reminders?test=true`
- **Headers**:
  - `x-api-key`: YOUR_KEY
- **Expected Status Code**: `200 OK`
- **Expected Response Body**:
  ```text
  Triggered
  ```

#### Expected Background Behavior & Terminal Logs:
1. Terminal will log:
   ```text
   ⏰ [CRON JOB STARTED] Processing monthly rent reminders for month: 2026-09
   📊 Found 3 total pending/partial rent records. 3 eligible for reminder notifications.
   ✅ Rent reminder sent to Resident Name (resident@example.com)
   📧 Admin summary notification sent to (admin@pujyasrithasliving.com): "3 tenants have pending rent payments"
   🏁 [CRON JOB COMPLETED] Sent: 3, Failed/Skipped: 0
   ```
2. Tenants with pending/partial status receive an email:
   - **Subject**: `Rent Payment Reminder - Pujyasritha's Living`
   - **Body**: `Hi {Name}, your rent is due. Please pay before due date.`
3. Admin receives summary email:
   - **Subject**: `Monthly Rent Reminders Summary - Pujyasritha's Living`
   - **Body**: `{count} tenants have pending rent payments`
4. Mongoose update: `RentPayment` documents set `reminderSentMonth: "2026-09"`.
5. Mongoose insert: Log entries added to `NotificationLog` collection with `status: "SENT"`.

---

### Test Case 4: Idempotency & Duplicate Email Prevention
- **Action**: Immediately re-run `POST http://localhost:3000/api/send-rent-reminders?test=true` with the same headers.
- **Expected Response Body**: `Triggered`
- **Expected Terminal Logs**:
  ```text
  📊 Found 3 total pending/partial rent records. 0 eligible for reminder notifications.
  🏁 [CRON JOB COMPLETED] Sent: 0, Failed/Skipped: 0
  ```
- **Result**: No duplicate emails sent to tenants because `reminderSentMonth` matches the current month (`"2026-09"`).

---

## 3. Production Testing (After Deploying)

Once deployed to your production environment (e.g., Google Cloud Run, AWS, VPS, or Render):

### cURL Test Command:
```bash
curl -X POST "https://your-production-domain.com/api/send-rent-reminders?test=true" \
     -H "x-api-key: YOUR_KEY
```

### Postman Configuration:
1. Set method to `POST`.
2. URL: `https://your-production-domain.com/api/send-rent-reminders?test=true`.
3. In **Headers** tab:
   - Key: `x-api-key`
   - Value: `<YOUR_CRON_SECRET>`
4. Click **Send**. Response should be `Triggered`.

---

## 4. Scheduling a Cron Job in Google Cloud Scheduler

Google Cloud Scheduler allows you to send an HTTP POST request automatically on a recurring schedule.

### Step-by-Step Google Cloud Scheduler Setup:

1. **Open Cloud Scheduler**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Search for **Cloud Scheduler** and click **Create Job**.

2. **Configure Job Details**:
   - **Name**: `monthly-rent-reminders`
   - **Region**: Select your preferred region (e.g., `us-central1` or `asia-south1`).
   - **Description**: `Automated monthly rent reminders sent on the last day of each month`
   - **Frequency**: Schedule expression for running on the last day of every month or daily at 23:59:
     - Run daily at 23:59 (Server/App handles last-day check): `59 23 * * *`
     - OR Run on 28th-31st of every month at 23:00: `0 23 28-31 * *`
   - **Timezone**: Select your local timezone (e.g., `India Standard Time (IST)` or `UTC`).

3. **Configure Target**:
   - **Target type**: `HTTP`
   - **URL**: `https://your-production-domain.com/api/send-rent-reminders`
   - **HTTP method**: `POST`

4. **Configure HTTP Headers**:
   - Click **Add a header**:
     - **Name**: `x-api-key`
     - **Value**:  (Value of your `CRON_SECRET`)

5. **Auth Header (Optional)**:
   - If your Cloud Run service requires Google IAM authentication, select **Add OIDC token**. Otherwise, set to **None** (since custom `x-api-key` protection is used).

6. **Create and Verify**:
   - Click **Create**.
   - In the Cloud Scheduler dashboard, locate `monthly-rent-reminders`.
   - Click the **3 dots (Actions)** menu next to the job and select **Force run**.
   - Check your application logs in Google Cloud Logging / stdout to verify successful execution (`Sent: X, Failed/Skipped: Y`).

