# 🏥 Smart Healthcare Platform — Operations Runbook

> **Version:** 1.0.0 &nbsp;|&nbsp; **Stack:** Next.js · Node.js/Express · MongoDB · RabbitMQ · Docker  
> **Architecture:** Cloud-native microservices with centralised API Gateway  
> **Audience:** Developers, QA Engineers, and University Examiners

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Setup & Installation](#2-local-setup--installation)
3. [Environment Configuration](#3-environment-configuration)
4. [Docker Execution — The Master Command](#4-docker-execution--the-master-command)
5. [Port Mapping & Access URLs](#5-port-mapping--access-urls)
6. [Service Health Verification](#6-service-health-verification)
7. [End-to-End Testing Flows](#7-end-to-end-testing-flows)
8. [Troubleshooting Reference](#8-troubleshooting-reference)
9. [Architecture Diagram](#9-architecture-diagram)

---

## 1. Prerequisites

Ensure all of the following tools are installed and accessible in your `PATH` before proceeding.

| Tool | Minimum Version | Verify Command |
|---|---|---|
| **Docker Desktop** | 24.x or later | `docker --version` |
| **Docker Compose** | V2 (bundled with Docker Desktop) | `docker compose version` |
| **Node.js** *(local dev only)* | 18.x LTS or later | `node --version` |
| **npm** *(local dev only)* | 9.x or later | `npm --version` |
| **Git** | Any recent version | `git --version` |

> [!IMPORTANT]
> **Docker Desktop must be running** before executing any `docker compose` command. On Windows, ensure WSL 2 integration is enabled in Docker Desktop settings.

---

## 2. Local Setup & Installation

> [!NOTE]
> **If you are running the project via Docker Compose** (the recommended method), you do **not** need to run `npm install` manually — Docker handles all dependency installation during the image build step. Skip directly to [Section 4](#4-docker-execution--the-master-command).
>
> Run `npm install` manually only if you want to **develop or debug a specific service** outside of Docker.

### 2.1 Clone the Repository

```bash
git clone <your-repository-url>
cd healthcare-platform
```

### 2.2 Manual Dependency Installation (Local Development Only)

Run `npm install` in each of the following directories **separately**. Each service is an isolated Node.js application with its own `package.json`.

```bash
# 1. Frontend (Next.js)
cd frontend
npm install
cd ..

# 2. API Gateway
cd services/api-gateway
npm install
cd ../..

# 3. Patient Service
cd services/patient-service
npm install
cd ../..

# 4. Doctor Service
cd services/doctor-service
npm install
cd ../..

# 5. Appointment Service
cd services/appointment-service
npm install
cd ../..

# 6. Payment Service
cd services/payment-service
npm install
cd ../..

# 7. Notification Service
cd services/notification-service
npm install
cd ../..

# 8. AI Symptom Checker Service
cd services/ai-symptom-checker-service
npm install
cd ../..
```

### 2.3 Running a Single Service Locally

Once `npm install` is complete for the target service, use the development server command:

```bash
cd services/<service-name>
npm run dev       # Uses nodemon for hot-reload
# or
npm start         # Production mode (node server.js)
```

> [!WARNING]
> Running services individually locally requires local MongoDB instances and a local RabbitMQ broker. The inter-service communication (e.g., appointment-service calling doctor-service) **will not work** unless all dependent services are also running and reachable on their configured ports. Docker Compose is strongly recommended for full-stack testing.

---

## 3. Environment Configuration

### 3.1 Required `.env` Files

Each service directory contains a `.env` file. These files are **pre-configured for Docker Compose** and should work out of the box. Review and update them only if you need to connect real credentials.

| Directory | `.env` Key Variables to Review |
|---|---|
| `services/patient-service/` | `JWT_SECRET`, `CLOUDINARY_*`, `EMAIL_USER`, `EMAIL_PASS`, `ADMIN_BOOTSTRAP_EMAIL` |
| `services/notification-service/` | `EMAIL_USER`, `EMAIL_PASS`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| `services/appointment-service/` | `JWT_SECRET`, `RABBITMQ_URL` |
| `services/api-gateway/` | `JWT_SECRET` |
| `frontend/` | `NEXT_PUBLIC_API_URL` |

### 3.2 Root `.env` for Docker Compose

The `docker-compose.yml` references `${JWT_SECRET}` at the root level for the API Gateway. Create a `.env` file in the **project root** (alongside `docker-compose.yml`):

```bash
# healthcare-platform/.env
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 3.3 Email & SMS Credentials (Mock Mode)

> [!NOTE]
> **All email and SMS integrations run in Mock Mode by default.** If `EMAIL_USER` / `EMAIL_PASS` are not set in the notification-service `.env`, the service will print a clearly formatted mock email to the Docker container logs instead of sending a real email. This is intentional and perfect for demonstration purposes.
>
> To enable **real** emails, add your Gmail App Password to `services/notification-service/.env`:
> ```
> EMAIL_USER=your-gmail-address@gmail.com
> EMAIL_PASS=your-16-char-app-password
> ```

### 3.4 Cloudinary Credentials (Medical Report Upload)

Add to `services/patient-service/.env` to enable file uploads:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 4. Docker Execution — The Master Command

This is the **primary and recommended** way to run the entire platform. All 15 containers (7 microservices + 6 MongoDB instances + 1 RabbitMQ + 1 Frontend) are orchestrated with a single command.

### 4.1 Build and Launch the Entire Cluster

```bash
# Navigate to the project root (where docker-compose.yml lives)
cd healthcare-platform

# Build all Docker images and start all containers in detached (background) mode
docker compose up --build -d
```

> [!IMPORTANT]
> The **first build** takes 3–8 minutes as Docker downloads base images and installs all npm dependencies. Subsequent builds are significantly faster due to Docker's layer cache.

**What happens when you run this command:**

1. Docker pulls `mongo:latest` and `rabbitmq:3-management` images.
2. All 7 microservice images are built from their `Dockerfile`.
3. Containers start **in dependency order**: Databases → RabbitMQ → Microservices → API Gateway → Frontend.
4. RabbitMQ's `notification_queue` and `notification_dead_letter_queue` are asserted automatically when `notification-service` starts.

### 4.2 View Live Logs

```bash
# Stream logs from ALL containers simultaneously
docker compose logs -f

# Stream logs from a specific service only (recommended for debugging)
docker compose logs -f patient-service
docker compose logs -f notification-service
docker compose logs -f appointment-service
docker compose logs -f api-gateway
docker compose logs -f frontend
```

### 4.3 Check Container Status

```bash
# Verify all containers are running (STATUS should be "Up")
docker compose ps
```

Expected output (all services healthy):
```
NAME                         STATUS          PORTS
api-gateway                  Up              0.0.0.0:8080->8080/tcp
appointment-service          Up              0.0.0.0:3003->3003/tcp
appointment-db               Up              0.0.0.0:27019->27017/tcp
ai-symptom-checker-service   Up              0.0.0.0:3006->3006/tcp
doctor-service               Up              0.0.0.0:3002->3002/tcp
doctor-db                    Up              0.0.0.0:27018->27017/tcp
frontend                     Up              0.0.0.0:3000->3000/tcp
healthcare-rabbitmq          Up              0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
notification-service         Up              0.0.0.0:3005->3005/tcp
notification-db              Up              0.0.0.0:27021->27017/tcp
patient-service              Up              0.0.0.0:3001->3001/tcp
patient-db                   Up              0.0.0.0:27017->27017/tcp
payment-service              Up              0.0.0.0:3004->3004/tcp
payment-db                   Up              0.0.0.0:27020->27017/tcp
```

### 4.4 Shutdown and Clean Up

```bash
# Stop all containers (preserves data volumes — safe for development)
docker compose down

# Stop AND delete all data volumes (full reset — use when starting fresh)
docker compose down -v

# Stop a single service without affecting others
docker compose stop patient-service
```

### 4.5 Rebuild a Single Service After Code Changes

```bash
# Rebuild and restart only the appointment-service (without touching other containers)
docker compose up --build -d appointment-service
```

---

## 5. Port Mapping & Access URLs

### 5.1 Frontend & Gateway Access Points

| Application | Local URL | Description |
|---|---|---|
| 🌐 **Patient Portal (Frontend)** | **[http://localhost:3000](http://localhost:3000)** | The primary Next.js web application. Start here. |
| 🔀 **API Gateway** | **[http://localhost:8080](http://localhost:8080)** | Central entry point for all API calls. |
| 🐰 **RabbitMQ Admin UI** | **[http://localhost:15672](http://localhost:15672)** | Monitor queues, messages, and consumers. Login: `guest` / `guest` |

### 5.2 Complete Service Port Reference

| Container Name | Service | Host Port | Internal Port | Purpose |
|---|---|---|---|---|
| `frontend` | Next.js App | **3000** | 3000 | Patient-facing web UI |
| `api-gateway` | API Gateway | **8080** | 8080 | Reverse proxy for all microservices |
| `patient-service` | Patient & Auth | 3001 | 3001 | Registration, login, profiles, reports |
| `doctor-service` | Doctor | 3002 | 3002 | Doctor availability, prescriptions |
| `appointment-service` | Appointments | 3003 | 3003 | Booking, status management |
| `payment-service` | Payments | 3004 | 3004 | Mock checkout & verification |
| `notification-service` | Notifications | 3005 | 3005 | Email/SMS dispatch via RabbitMQ |
| `ai-symptom-checker-service` | AI Checker | 3006 | 3006 | Symptom analysis engine |
| `healthcare-rabbitmq` | RabbitMQ AMQP | 5672 | 5672 | Message broker (service-to-service) |
| `healthcare-rabbitmq` | RabbitMQ UI | **15672** | 15672 | Web admin dashboard |

### 5.3 MongoDB Database Ports (Direct Access)

Direct MongoDB access is available for inspection with tools like **MongoDB Compass**.

| Container | Database Name | Host Port |
|---|---|---|
| `patient-db` | `patientdb` | 27017 |
| `doctor-db` | `doctordb` | 27018 |
| `appointment-db` | `appointmentdb` | 27019 |
| `payment-db` | `paymentdb` | 27020 |
| `notification-db` | `notificationdb` | 27021 |
| `ai-symptom-checker-db` | `aisymptomcheckerdb` | 27022 |

### 5.4 API Gateway Route Mappings

All frontend API calls are routed through `http://localhost:8080/api/...`. The gateway transparently proxies to the responsible microservice.

| Gateway Prefix | Routed To | Example Endpoint |
|---|---|---|
| `/api/auth` | `patient-service:3001` | `POST /api/auth/login` |
| `/api/patients` | `patient-service:3001` | `GET /api/patients/reports` |
| `/api/doctors` | `doctor-service:3002` | `GET /api/doctors` |
| `/api/appointments` | `appointment-service:3003` | `POST /api/appointments` |
| `/api/payments` | `payment-service:3004` | `POST /api/payments/checkout` |
| `/api/notifications` | `notification-service:3005` | `GET /api/notifications/logs` |
| `/api/symptom-checker` | `ai-symptom-checker-service:3006` | `POST /api/symptom-checker/analyze` |

---

## 6. Service Health Verification

After running `docker compose up`, verify all services are healthy by hitting their health check endpoints. Every microservice exposes a `/health` route.

```bash
# API Gateway
curl http://localhost:8080/health

# Patient Service (via gateway)
curl http://localhost:8080/api/patients/health
# or directly:
curl http://localhost:3001/health

# Appointment Service
curl http://localhost:3003/health

# Notification Service
curl http://localhost:3005/health
```

**Expected response for any healthy service:**

```json
{
  "status": "OK",
  "service": "patient-service",
  "database": "connected",
  "timestamp": "2026-04-15T00:00:00.000Z"
}
```

> [!TIP]
> If `"database": "disconnected"` appears, the MongoDB container for that service may still be initialising. Wait 10–15 seconds and retry. MongoDB containers typically need 5–10 seconds after Docker starts them before accepting connections.

---

## 7. End-to-End Testing Flows

The following flows test the complete integration of the system — from the browser, through the API Gateway, into the microservices, and through the event-driven RabbitMQ pipeline.

---

### Flow A: Patient Registration & Profile Completion

**Objective:** Verify the authentication system, JWT generation, and profile persistence in MongoDB.

**Expected System Behaviour:** A new user document is created in `patient-db`, a signed JWT token is issued and stored in `localStorage`, and the user is redirected to the main dashboard.

---

**Step 1 — Navigate to the Platform**

Open your browser and go to:
```
http://localhost:3000
```

You should see the Smart Healthcare Platform landing page or login screen.

---

**Step 2 — Open the Registration Page**

Click **"Create Account"** or **"Register"** on the login page. You will be taken to the registration form.

---

**Step 3 — Fill in the Registration Form**

Enter the following details:

| Field | Example Value | Validation Rule |
|---|---|---|
| Full Name | `John Smith` | Min 2 chars, letters only |
| Email Address | `john.smith@example.com` | Valid email format |
| Password | `SecurePass1` | Min 8 chars, 1 uppercase, 1 number |
| Role | `Patient` (default) | Patient or Doctor |
| Phone *(optional)* | `+1 555 000 1234` | Valid phone format |

> [!NOTE]
> To register an **Admin account**, register with the email address configured as `ADMIN_BOOTSTRAP_EMAIL` in `services/patient-service/.env` (default: `admin@system.com`). The system automatically assigns the Admin role to this specific email only.

---

**Step 4 — Submit and Verify**

Click **"Create Account"**. The following should happen:

- ✅ The form submits to `POST http://localhost:8080/api/auth/register`
- ✅ The API Gateway proxies the request to `patient-service:3001`
- ✅ The password is hashed with **bcrypt** (12 salt rounds)
- ✅ A new document is saved in the `patientdb.users` MongoDB collection
- ✅ A **JWT token** (7-day expiry) is returned and stored in `localStorage`
- ✅ You are redirected to `/dashboard`

**Verify in MongoDB Compass:**
Connect to `mongodb://localhost:27017` and navigate to `patientdb > users`. You should see your new user document with a hashed `password` field.

---

**Step 5 — Complete Your Profile**

Navigate to **`http://localhost:3000/dashboard/profile`**

- Fill in **Date of Birth**, **Phone Number**, and **Address**
- Click **"Update Profile"**
- A ✅ success toast notification should appear in the bottom-right corner
- Verify the change persisted by refreshing the page

**Navigate to the Clinical History tab:**

- Add a medical condition (e.g., `Asthma`)
- Click **"Add Tag"** — the condition badge should appear instantly
- Click **"Save Medical Data"**
- A success toast confirms the data was saved to MongoDB

---

### Flow B: Medical Vault Upload

**Objective:** Verify the complete event-driven pipeline — file upload to Cloudinary, RabbitMQ event publishing, and notification-service consumption.

**Expected System Behaviour:** The file is uploaded to Cloudinary, a `REPORT_UPLOADED` event is published to `notification_queue` in RabbitMQ, the notification-service consumes the event and dispatches an email (real or mock), and a `NotificationLog` record is written to `notification-db`.

---

**Step 1 — Navigate to Reports**

Go to: **`http://localhost:3000/dashboard/reports`**

You should see the **"Upload New Document"** form on the left and the **"Document Library"** on the right (empty on first visit).

---

**Step 2 — Fill in the Upload Form**

| Field | Example Value |
|---|---|
| Report Title | `Annual Blood Panel — April 2026` |
| Document Type | `Blood Test` |
| File | Select any `.pdf`, `.jpg`, or `.png` file (max 5 MB) |

**Observe the real-time progress bar** that appears as the file uploads.

> [!TIP]
> For a quick demo, take any screenshot on your computer and upload it as the test file. The system accepts `.jpg` and `.png` image formats.

---

**Step 3 — Submit the Upload**

Click **"Secure Upload"**. The following pipeline triggers:

```
Browser → POST /api/patients/reports (multipart/form-data)
       → API Gateway :8080
       → patient-service :3001
       → Multer middleware (validates file type & size)
       → Cloudinary (stores file, returns secure URL)
       → MongoDB: MedicalReport document saved in patientdb
       → RabbitMQ: publishNotificationEvent("REPORT_UPLOADED") → notification_queue
       → notification-service: consumes message
       → Nodemailer: sends HTML email (or prints mock to console)
       → MongoDB: NotificationLog saved in notificationdb
```

---

**Step 4 — Verify in the UI**

- ✅ A ✅ **toast notification** appears: *"Report uploaded successfully!"*
- ✅ The new report card appears in the Document Library with the correct emoji icon (🩸 for Blood Test)
- ✅ Clicking **"View"** opens the Cloudinary-hosted file in a new tab

---

**Step 5 — Verify in RabbitMQ Admin UI**

Open **[http://localhost:15672](http://localhost:15672)** (login: `guest` / `guest`)

1. Click the **"Queues and Streams"** tab
2. You should see **`notification_queue`** listed
3. The **"Messages Ready"** counter will momentarily spike and then drop back to 0 (because the notification-service consumed it immediately)
4. The **`notification_dead_letter_queue`** is also listed — it should be empty, confirming no failures

---

**Step 6 — Verify the Email (Console / Real)**

**Mock mode (no credentials configured):**

```bash
docker compose logs -f notification-service
```

Look for a mock email block in the output:
```
════════════════════════════════════════════════════════
✉️  MOCK EMAIL (no credentials configured)
   To:      john.smith@example.com
   Subject: Your Medical Report Has Been Uploaded ✅
   Summary: Report 'Annual Blood Panel — April 2026' uploaded.
════════════════════════════════════════════════════════
```

**Real mode (Gmail credentials configured):**
Check your inbox. You should receive a professionally designed HTML email with the report details, document type, upload timestamp, and a "View My Reports" CTA button.

---

**Step 7 — Verify the Notification Log**

This will be confirmed visually in Flow C below. The notification log entry is now stored in `notificationdb`.

---

### Flow C: Admin System Audit

**Objective:** Verify the admin control plane — user management, doctor verification, and the live notification audit log.

**Expected System Behaviour:** The admin can see all registered users, verify pending doctor accounts, toggle user access, and inspect real-time notification logs showing every `REPORT_UPLOADED` and `APPOINTMENT_BOOKED` event.

---

**Step 1 — Log In as Admin**

On the login page, use the admin credentials:

```
Email:    admin@system.com   (or your configured ADMIN_BOOTSTRAP_EMAIL)
Password: (whatever you registered with)
```

> [!IMPORTANT]
> The admin account must be **registered first** via the standard registration form using the exact email address set in `ADMIN_BOOTSTRAP_EMAIL`. The system automatically promotes this email to the admin role on registration.

---

**Step 2 — Navigate to the Admin Console**

Go to: **`http://localhost:3000/dashboard/admin`**

Non-admin users are automatically redirected away from this page. You should see the **Platform Administration** panel.

---

**Step 3 — Inspect the User Management Engine**

The **"User Management"** tab (active by default) displays a table of all registered users with:

| Column | Description |
|---|---|
| **User** | Name, email, and gradient avatar initial |
| **Role** | Colour-coded badge (purple=Admin, blue=Doctor, grey=Patient) |
| **Status** | Active/Banned badge + "⚠️ Needs Verification" for unverified doctors |
| **Actions** | "Verify" button (doctors), "Ban"/"Unban" toggle |

**Verify a Doctor Account:**

1. Register a second account using role = "Doctor"
2. Return to the admin page and refresh
3. The doctor row will show **⚠️ Needs Verification**
4. Click **"Verify"** — a loading toast appears while the request processes
5. The badge updates to `Active` and the "Needs Verification" label disappears
6. A ✅ success toast confirms: *"Doctor verified successfully!"*

**What happens behind the scenes:**

```
Browser → PATCH /api/patients/admin/doctors/:id/verify
       → API Gateway :8080
       → patient-service :3001 (adminController.verifyDoctor)
       → MongoDB: user.isVerified = true saved to patientdb
```

**Ban/Unban a User:**

1. Click **"Ban"** on any non-admin user row
2. A confirmation dialog asks for intent
3. After confirmation, a loading toast shows while the request processes
4. The user's status badge changes from `● Active` to `● Banned`
5. That user will receive a 403 error on their next login attempt

---

**Step 4 — Inspect the Live Notification Audit Logs**

Click the **"Notification Logs"** tab. You should see a dark-themed terminal-style log table showing every notification event processed by the system.

| Column | Description |
|---|---|
| **Timestamp** | Date and time the event was processed (e.g., `Apr 15, 12:30:45 AM`) |
| **Event** | The RabbitMQ event type (`REPORT_UPLOADED`, `APPOINTMENT_BOOKED`) |
| **Recipient** | The patient's email address |
| **Type** | Notification channel (`EMAIL`, `SMS`, `BOTH`) |
| **Status** | `[SENT]` (green), `[PENDING]` (amber), or `[FAILED]` (red) |

If you completed **Flow B** above, you should see at least one `REPORT_UPLOADED` row with status `[SENT]`.

**What happens behind the scenes:**

```
Browser → GET /api/notifications/logs
       → API Gateway :8080
       → notification-service :3005 (logController.getSystemLogs)
       → MongoDB: NotificationLog.find().sort({createdAt: -1}).limit(50)
```

**Verify in MongoDB Compass:**

Connect to `mongodb://localhost:27021` and navigate to `notificationdb > notificationlogs`. Each document contains:
```json
{
  "recipientId": "...",
  "recipientEmail": "john.smith@example.com",
  "type": "EMAIL",
  "eventTrigger": "REPORT_UPLOADED",
  "status": "SENT",
  "createdAt": "2026-04-15T00:00:00.000Z"
}
```

---

## 8. Troubleshooting Reference

### Common Issues and Resolutions

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Frontend shows blank page | Next.js container still building | Wait 30s and refresh. Run `docker compose logs -f frontend` to monitor. |
| `502 Bad Gateway` from API | Downstream microservice crashed | Run `docker compose logs -f <service-name>` to see the error. |
| Login returns 500 | `JWT_SECRET` not set in `.env` | Ensure root `.env` file exists with `JWT_SECRET=...` |
| File upload fails | Cloudinary credentials missing | Either add Cloudinary keys or accept that upload will fail (no mock mode for Cloudinary). |
| RabbitMQ connection refused | RabbitMQ container took too long to start | Services auto-retry every 5s. Wait and check `docker compose logs -f notification-service`. |
| Notification logs tab is empty | notification-service RabbitMQ consumer not started | Check `docker compose logs notification-service` for `✅ Connected to RabbitMQ` message. |
| `docker compose` not found | Using old Docker Compose V1 | Use `docker compose` (with a space, V2) instead of `docker-compose` (with a hyphen, V1). |

### Resetting the Entire Database

```bash
# Full nuclear reset — destroys ALL data volumes and rebuilds from scratch
docker compose down -v
docker compose up --build -d
```

### Inspecting a Specific Database

```bash
# Open a mongo shell inside any database container
docker exec -it patient-db mongosh patientdb

# Useful queries:
db.users.find({}).pretty()
db.users.countDocuments()
db.medicalreports.find({}).pretty()
```

```bash
# Inspect notification logs
docker exec -it notification-db mongosh notificationdb
db.notificationlogs.find({}).sort({ createdAt: -1 }).limit(10).pretty()
```

---

## 9. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│                    http://localhost:3000                             │
│                      Next.js Frontend                               │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS API calls
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                 │
│                    http://localhost:8080                             │
│         Routes: /api/auth  /api/patients  /api/doctors              │
│                 /api/appointments  /api/payments                     │
│                 /api/notifications  /api/symptom-checker             │
└──────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────┘
       │          │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼          ▼
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ patient  │ │  doctor  │ │appoint-  │ │ payment  │ │notify    │ │  ai      │
 │ service  │ │ service  │ │  ment    │ │ service  │ │ service  │ │symptom   │
 │  :3001   │ │  :3002   │ │ service  │ │  :3004   │ │  :3005   │ │checker   │
 │          │ │          │ │  :3003   │ │          │ │          │ │  :3006   │
 └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┘
      │            │            │            │            │
      ▼            ▼            ▼            ▼            ▲
 ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
 │patient  │  │doctor   │  │appoint  │  │payment  │     │
 │  -db    │  │  -db    │  │  -db    │  │  -db    │     │
 │:27017   │  │:27018   │  │:27019   │  │:27020   │     │
 └─────────┘  └─────────┘  └─────────┘  └─────────┘     │
                                                          │
      ┌─────────────────────────────────────────┐         │
      │              RabbitMQ Broker             │─────────┘
      │         AMQP :5672 | UI :15672           │ (consumes events)
      │   ┌──────────────────────────────────┐   │
      │   │  notification_queue (main)        │   │
      │   │  notification_dead_letter_queue   │   │
      │   └──────────────────────────────────┘   │
      └─────────────────────────────────────────┘
            ▲ publishNotificationEvent()
            │
            └──── patient-service (REPORT_UPLOADED)
            └──── appointment-service (APPOINTMENT_BOOKED)
```

### Event-Driven Message Flow

```
Patient uploads report
        │
        ▼
patient-service saves to MongoDB
        │
        ▼
publishNotificationEvent("REPORT_UPLOADED") ──► notification_queue
                                                        │
                                                        ▼
                                              notification-service
                                              consumes message
                                                        │
                                              ┌─────────┴─────────┐
                                              │                   │
                                              ▼                   ▼
                                       Nodemailer              Twilio
                                       (HTML Email)            (SMS)
                                              │                   │
                                              └─────────┬─────────┘
                                                        ▼
                                              NotificationLog
                                              saved to MongoDB
                                              (status: SENT or FAILED)
                                                        │
                                              On FAILED: nack() ──► DLQ
                                              (message preserved, not lost)
```

---

*This runbook is the definitive operational guide for the Smart Healthcare Appointment & Telemedicine Platform. For architecture decisions and code-level documentation, refer to the inline JSDoc comments within each service's controller and middleware files.*

*Last Updated: April 2026*
