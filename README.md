# 🏥 Healthcare Platform - AI-Enabled Smart Healthcare System

## 📋 Project Overview

A cloud-native healthcare platform that enables patients to book doctor appointments, attend video consultations, upload medical reports, and receive AI-based preliminary health suggestions. Built with microservices architecture, containerized with Docker, and orchestrated with Kubernetes.

### 🌟 Key Features
- **Patient Management**: Register, manage profiles, upload medical reports, view prescriptions
- **Doctor Management**: Manage profiles, set availability, conduct video consultations, issue prescriptions
- **Appointment Service**: Search doctors by specialty, book/modify/cancel appointments, real-time tracking
- **Telemedicine**: Secure video consultations using third-party APIs (Agora/Twilio/Jitsi)
- **Payment Integration**: Online payments via PayHere/Dialog Genie/Stripe
- **Notifications**: Email and SMS alerts for appointments and consultations

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **API Gateway**: Express + http-proxy-middleware
- **Message Queue**: RabbitMQ (for async communication)
- **Cache**: Redis

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context API

### DevOps & Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions (optional)
- **Monitoring**: Prometheus + Grafana (optional)

### Third-Party Integrations
- **Video Calls**: Agora.io / Twilio / Jitsi Meet
- **Payments**: PayHere / Stripe (Sandbox)
- **Notifications**: Twilio (SMS) / SendGrid (Email)
- **AI/ML**: OpenAI API / Custom ML Model

## 📁 Project Structure

```
healthcare-platform/
│
├── services/                           # Backend microservices
│   ├── api-gateway/                    # API Gateway service
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── server.js
│   │   └── .env.example
│   │
│   ├── patient-service/                # Patient management
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── server.js
│   │   ├── src/
│   │   │   ├── models/                 # MongoDB models
│   │   │   ├── controllers/            # Business logic
│   │   │   ├── routes/                 # API routes
│   │   │   ├── middleware/             # Auth, validation
│   │   │   └── utils/                  # Helper functions
│   │   └── .env.example
│   │
│   ├── doctor-service/                 # Doctor management
│   ├── appointment-service/            # Appointment handling
│   ├── payment-service/                # Payment processing
│   ├── notification-service/           # Email/SMS notifications
│   ├── telemedicine-service/           # Video consultation
│   └── ai-symptom-checker/             # AI health suggestions
│
├── frontend/                           # Next.js frontend application
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── package.json
│   ├── .env.local.example
│   ├── public/                         # Static assets
│   └── src/
│       ├── app/                        # App router pages
│       │   ├── layout.js               # Root layout
│       │   ├── page.js                 # Home page
│       │   ├── login/                  # Login page
│       │   ├── register/               # Registration page
│       │   ├── dashboard/              # Patient dashboard
│       │   ├── doctor/                 # Doctor dashboard
│       │   ├── admin/                  # Admin dashboard
│       │   └── appointments/           # Appointment management
│       ├── components/                 # Reusable components
│       │   ├── AuthProvider.js         # Auth context
│       │   ├── Navbar.js               # Navigation bar
│       │   └── VideoCall.js            # Video consultation component
│       ├── services/                   # API services
│       │   └── api.js                  # Axios configuration
│       ├── utils/                      # Helper functions
│       └── styles/                     # Global styles
│
├── kubernetes/                         # Kubernetes manifests
│   ├── namespace.yaml
│   ├── secrets.yaml
│   ├── configmap.yaml
│   ├── patient-service/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── doctor-service/
│   ├── appointment-service/
│   ├── api-gateway/
│   ├── mongodb/
│   ├── ingress.yaml
│   └── hpa.yaml                        # Horizontal Pod Autoscaler
│
├── docker-compose.yml                  # Local development setup
├── docker-compose.prod.yml             # Production setup
├── .gitignore
├── README.md
└── LICENSE
```

## 🚀 Getting Started

### Prerequisites

- **Docker Desktop** (with Kubernetes enabled) - [Download](https://www.docker.com/products/docker-desktop)
- **Node.js** 18+ - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **MongoDB Compass** (optional, for database management)

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/your-username/healthcare-platform.git
cd healthcare-platform
```

#### 2. Environment Configuration

Create `.env` files for each service (copy from `.env.example`):

```bash
# Patient Service
cp services/patient-service/.env.example services/patient-service/.env

# Doctor Service
cp services/doctor-service/.env.example services/doctor-service/.env

# Appointment Service
cp services/appointment-service/.env.example services/appointment-service/.env

# API Gateway
cp services/api-gateway/.env.example services/api-gateway/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

Edit the `.env` files with your configuration (database URLs, JWT secrets, API keys).

#### 3. Run with Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean database)
docker-compose down -v
```

#### 4. Manual Development Setup (Without Docker)

```bash
# Start MongoDB databases (separate terminals)
mongod --dbpath ./data/patient-db --port 27017
mongod --dbpath ./data/doctor-db --port 27018
mongod --dbpath ./data/appointment-db --port 27019

# Start backend services
cd services/patient-service && npm install && npm run dev
cd services/doctor-service && npm install && npm run dev
cd services/appointment-service && npm install && npm run dev
cd services/api-gateway && npm install && npm run dev

# Start frontend
cd frontend && npm install && npm run dev
```

## 📡 Access Points

After running `docker-compose up -d`, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React/Next.js web interface |
| **API Gateway** | http://localhost:8080 | Main entry point for API calls |
| **API Gateway Health** | http://localhost:8080/health | Health check |
| **Patient Service** | http://localhost:3001/health | Patient service health |
| **Doctor Service** | http://localhost:3002/health | Doctor service health |
| **Appointment Service** | http://localhost:3003/health | Appointment service health |
| **MongoDB Patient DB** | mongodb://localhost:27017 | Patient database |
| **MongoDB Doctor DB** | mongodb://localhost:27018 | Doctor database |
| **MongoDB Appointment DB** | mongodb://localhost:27019 | Appointment database |
| **RabbitMQ Management** | http://localhost:15672 | Message queue dashboard (admin/admin123) |
| **Redis** | redis://localhost:6379 | Cache server |

## 🔌 API Endpoints

### API Gateway Routes (http://localhost:8080)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Gateway health check | No |

### Patient Service (3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

### Doctor Service (3002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

### Appointment Service (3003)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

## 🧪 Testing

### Test API Endpoints

```bash
# Test API Gateway
curl http://localhost:8080/health

# Test Patient Service
curl http://localhost:3001/health

# Test Doctor Service
curl http://localhost:3002/health

# Test Appointment Service
curl http://localhost:3003/health

# Test user registration
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"123456","role":"patient"}'

# Test user login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"123456"}'
```

### Run Unit Tests

```bash
# For backend services
cd services/patient-service
npm test

# For frontend
cd frontend
npm test
```

## 🐳 Docker Commands

### Development

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build patient-service

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f patient-service

# Rebuild and start
docker-compose up -d --build
```

### Production

```bash
# Using production compose file
docker-compose -f docker-compose.prod.yml up -d
```

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (Docker Desktop Kubernetes or Minikube)
- kubectl configured

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Create secrets
kubectl apply -f kubernetes/secrets.yaml

# Deploy MongoDB
kubectl apply -f kubernetes/mongodb/

# Deploy microservices
kubectl apply -f kubernetes/patient-service/
kubectl apply -f kubernetes/doctor-service/
kubectl apply -f kubernetes/appointment-service/
kubectl apply -f kubernetes/api-gateway/

# Deploy frontend
kubectl apply -f kubernetes/frontend/

# Apply Ingress
kubectl apply -f kubernetes/ingress.yaml

# Check deployment status
kubectl get all -n healthcare-platform

# View logs
kubectl logs -f deployment/patient-service -n healthcare-platform

# Scale service
kubectl scale deployment patient-service --replicas=3 -n healthcare-platform
```

### Access in Kubernetes

Add to `/etc/hosts` (or use minikube tunnel):
```
127.0.0.1 healthcare.local
```

Then access: http://healthcare.local

## 📊 Monitoring (Optional)

### Prometheus & Grafana

```bash
# Deploy monitoring stack
kubectl apply -f kubernetes/monitoring/

# Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring
# Login: admin/admin
```

## 🔐 Security

- **JWT Authentication**: All API requests (except login/register) require JWT
- **Password Hashing**: BCrypt for secure password storage
- **Role-Based Access Control**: Patient, Doctor, Admin roles with different permissions
- **CORS**: Configured to allow only trusted origins
- **Rate Limiting**: Implemented in API Gateway to prevent abuse
- **HTTPS**: Use SSL/TLS in production (Let's Encrypt)

## 🚦 CI/CD Pipeline (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker images
        run: |
          docker build -t patient-service ./services/patient-service
          docker build -t doctor-service ./services/doctor-service
          # ... build other services
      
      - name: Push to Docker Hub
        run: |
          docker push your-dockerhub/patient-service:latest
          # ... push other images
      
      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f kubernetes/
```

## 👥 Team Contributions

### Project Lead & Infrastructure
- **Name**: [Your Name]
- **Registration No**: [Your Reg No]
- **Contributions**:
  - Project architecture design
  - Docker & Kubernetes setup
  - API Gateway implementation
  - CI/CD pipeline configuration
  - MongoDB database design
  - Code review and integration

### Backend Development
- **Name**: [Team Member 2]
- **Registration No**: [Reg No]
- **Contributions**:
  - Patient Service (CRUD, authentication)
  - Doctor Service (profile, availability)
  - JWT authentication implementation
  - Database schema design

### Backend & Integration
- **Name**: [Team Member 3]
- **Registration No**: [Reg No]
- **Contributions**:
  - Appointment Service (booking, scheduling)
  - Payment Service integration
  - Notification Service (email/SMS)
  - Inter-service communication

### Frontend Development
- **Name**: [Team Member 4]
- **Registration No**: [Reg No]
- **Contributions**:
  - React/Next.js application
  - UI/UX design and implementation
  - Video consultation interface
  - API integration with backend
  - Responsive design

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- University of [Your University] - Course SE3020 Distributed Systems
- Open source community for amazing tools and libraries
- Third-party service providers (Agora, Stripe, etc.)

## 📞 Support

For issues, questions, or contributions:
- **GitHub Issues**: [Create an issue](https://github.com/your-username/healthcare-platform/issues)
- **Email**: [your-email@example.com]
- **Documentation**: [Link to wiki/docs]

## 🎯 Roadmap

- [ ] AI Symptom Checker integration
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Real-time chat between patients and doctors
- [ ] Electronic health records (EHR) integration
- [ ] Analytics dashboard for admin
- [ ] Automated appointment reminders
- [ ] Prescription management system
- [ ] Integration with hospital management systems

---

## 📋 Quick Reference Card

### Common Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Rebuild and start
docker-compose up -d --build

# View logs for specific service
docker-compose logs -f patient-service

# Enter container shell
docker exec -it patient-service sh

# Clean up everything (including volumes)
docker-compose down -v
```

### Environment Variables Required

| Service | Variables |
|---------|-----------|
| Patient Service | `PORT`, `DB_URL`, `JWT_SECRET` |
| Doctor Service | `PORT`, `DB_URL`, `JWT_SECRET` |
| Appointment Service | `PORT`, `DB_URL`, `PATIENT_SERVICE_URL`, `DOCTOR_SERVICE_URL` |
| API Gateway | `PORT`, `PATIENT_SERVICE`, `DOCTOR_SERVICE`, `APPOINTMENT_SERVICE` |
| Frontend | `NEXT_PUBLIC_API_URL` |

### Default Credentials (For Testing)

After first run, create these test accounts:

**Patient:**
- Email: `patient@test.com`
- Password: `patient123`

**Doctor:**
- Email: `doctor@test.com`
- Password: `doctor123`

**Admin:**
- Email: `admin@test.com`
- Password: `admin123`

---

**Built for SE3020 - Distributed Systems Assignment**
