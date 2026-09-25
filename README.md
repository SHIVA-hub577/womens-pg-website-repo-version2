# Pujyasritha's Living — Women's PG & Hostel Management Portal 🏡

A modern, full-stack web application built with **Node.js**, **Express**, **MongoDB (Mongoose)**, **EJS**, and **Tailwind CSS v4** designed specifically for managing a boutique residential women's PG / hostel with dedicated security, home-cooked hospitality, and seamless digital administration.

---

## 🌟 Key Features

### 👤 Resident Portal (`/tenant`)
* **Room & Occupancy Summary**: Access assigned room number, sharing type (1, 2, 3, 4 sharing), monthly rent, and refundable advance deposit details.
* **Monthly Rent Tracking & Self-Reporting**: View payment status (`Paid`, `Partial`, `Pending`) for current and historical billing cycles and submit rent payments.
* **Roommate Directory**: View current roommates assigned to the same room.
* **Complaint Registration & Evidence Upload**: Raise service/maintenance requests with description and photo uploads, and track resolution status in real-time.

### 🛠️ Maintenance Worker Portal (`/worker`)
* **Worker Authentication**: Dedicated login (`/worker/login`) and registration (`/worker/register`) flow for maintenance staff with role-based access (`isWorker`).
* **Assigned Complaints View**: Maintenance workers can view complaints assigned to them (or open complaints) with resident contact info (phone, email, room number), issue description, and uploaded evidence photo.
* **Progress Updates Timeline**: Workers can post work progress notes and optional progress photos to the non-chat updates timeline.
* **Resolution & Proof Submission**: Workers can mark complaints as resolved by posting resolution descriptions and uploading photo proof of completion. Automated email notifications are dispatched to both the **Tenant** and **Admin**.

### 🛡️ Admin Management Suite (`/admin`)
* **Live Property Dashboard**: Aggregated metrics for total rooms, occupied rooms, vacant rooms, and total active residents.
* **Rooms Directory**: Complete list of PG rooms, sharing capacity, rent breakdown, and tenant occupancy.
* **Resident Allotment Flow**: Filter available vacant/partial rooms by sharing type and allot new residents with mandatory emergency contact details (Emergency Contact Number & Relation) and phone validation.
* **Tenants Directory**: Complete directory of active residents displaying assigned room, contact details, emergency contact info & relation, joining date, and payment status.
* **Rent Payments Overview**:
  * Filter monthly billing records across all residents.
  * Update payment statuses (`Paid`, `Partial`, `Pending`) with custom partial amount validation.
  * **Export CSV**: Download payment records as a `.csv` spreadsheet.
  * **Send to Email**: Automatically generate and email monthly CSV reports directly to the admin's inbox.
* **Complaints Management & Worker Assignment**: Inspect resident complaints, assign registered workers from a dropdown, post progress update notes, and mark complaints as resolved. Sends resolution emails to both the **Tenant** and **Assigned Worker**.
* **Secure Resident Departure Protocol**: 3-step cascading filter (Sharing Type → Room Number → Resident) with a 6-digit email verification OTP code to confirm resident removal.
* **Removed Tenants Database & Audit Log**: Automatically archives every removed tenant's profile, room history, emergency contact details, rent details, removal date, and acting administrator into a dedicated `removed-tenants` collection. Features an interactive sidebar view (`/admin/removed-tenants`) with **month filtering options** (select a specific month or "All"), and instant email dispatch ("Send to Mail") sending filtered data reports and CSV files directly to the admin Gmail address.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Framework** | Node.js, Express.js |
| **Database & ODM** | MongoDB, Mongoose |
| **Authentication** | Passport.js (Local & Google OAuth 2.0), bcrypt, express-session, connect-mongo |
| **Templating Engine** | EJS (Embedded JavaScript) |
| **Styling & UI** | Tailwind CSS v4 CLI, Custom Design Tokens, Google Fonts (*Literata* & *Work Sans*) |
| **File Uploads** | Multer |
| **Email & Export** | Nodemailer (Gmail OAuth2), CSV-Writer |

---

## 📁 Repository Directory Structure

```text
womens-pg-project/
├── config/
│   ├── db.js                 # MongoDB connection setup
│   └── passport.js           # Passport Local & Google OAuth strategies
├── controllers/
│   ├── authController.js     # User registration, login, OTP verification (Admin, Tenant, Worker)
│   ├── complaintController.js# Resident, Worker, & Admin complaint update & resolution handlers
│   ├── dashboardController.js# Admin dashboard, rooms, allotments, payments, & removal
│   └── reminderController.js # Automated monthly rent reminder cron job handler
├── middlewares/
│   ├── authMiddleware.js     # Session & role-based route protection (isAdmin, isTenant, isWorker)
│   └── uploadMiddleware.js   # Multer file upload & validation middleware
├── models/
│   ├── Admin.js              # Admin schema
│   ├── Complaint.js          # Resident complaints & updates timeline schema
│   ├── NotificationLog.js    # Reminder email notification log schema
│   ├── Otp.js                # Email verification OTP schema
│   ├── RemovedTenant.js      # Historical removed tenants archive schema (removed-tenants collection)
│   ├── RentPayment.js        # Monthly rent tracking schema (with reminderSentMonth tracking)
│   ├── Room.js               # PG rooms & embedded tenant schema
│   ├── Tenant.js             # Resident user account schema
│   ├── TenantRemoval.js      # Departure OTP protocol schema
│   └── Worker.js             # Maintenance worker user account schema
├── public/
│   ├── css/
│   │   └── style.css         # Compiled Tailwind CSS bundle
│   └── uploads/              # Uploaded complaint & resolution images
├── routes/
│   ├── adminRoutes.js        # Admin endpoints
│   ├── apiRoutes.js          # Secured external API endpoints (POST /api/send-rent-reminders)
│   ├── authRoutes.js         # Authentication endpoints (Admin, Tenant, Worker)
│   ├── tenantRoutes.js       # Resident portal endpoints
│   └── workerRoutes.js       # Worker portal endpoints
├── services/
│   └── emailservices.js      # Nodemailer transport & sendNotification mailer wrapper
├── src/
│   └── input.css             # Tailwind v4 source styles & design system tokens
├── views/
│   ├── admin/                # Admin EJS templates
│   ├── auth/                 # Auth EJS templates (Login & Register for Tenant, Admin, Worker)
│   ├── partials/             # Shared header, footer, & sidebar partials
│   ├── tenant/               # Resident EJS templates
│   ├── worker/               # Maintenance worker EJS templates
│   └── index.ejs             # Portal Landing Page
├── app.js                    # Express application entry point
├── package.json              # Project dependencies & npm scripts
├── testing-cron.md           # Step-by-step Postman testing & Google Cloud Scheduler guide
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started & Installation

### Prerequisites
* **Node.js** (v18+ recommended)
* **MongoDB** (local MongoDB instance or MongoDB Atlas cluster URI)
* **Google OAuth2 Credentials** (for email dispatch & Google Sign-In)

### 1. Clone the Repository
```bash
git clone https://github.com/SHIVA-hub577/womens-pg-website-repo.git
cd womens-pg-website-repo
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory by copying the sample template:
```bash
cp .env.example .env
```
Fill in your configuration details in `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/womens-pg
SESSION_SECRET=your_secret_key

# Nodemailer / Google OAuth 2.0 Credentials
GOOGLEUSER=your_email@gmail.com
GOOGLECLIENTID=your_client_id
GOOGLECLIENTSECRET=your_client_secret
GOOGLEREFRESHTOKEN=your_refresh_token
```

### 4. Build CSS Bundle
Compile the Tailwind CSS stylesheet:
```bash
npm run build:css
```
*(Optionally run `npm run watch:css` during active development to auto-recompile on `.ejs` modifications).*

### 5. Run the Application
Start the server:
```bash
npm start
```
Or run with live reload using Nodemon:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## 🛡️ Security & Privacy
* Secret configuration files (`.env`) and heavy binary artifacts (`node_modules/`) are strictly excluded from version control via `.gitignore`.
* Passwords are hashed securely using `bcrypt` before storage.
* Administrative routes are protected using session role-based middleware (`isAdmin`).

---

## 📄 License
Distributed under the **MIT License**.
