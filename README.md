# Reseller Engagement (CREDIT BACK) System

A production-style web application for managing reseller engagement, credit back programs, promotions, and WhatsApp interactions for Blinds & Curtains resellers across UAE, Saudi Arabia, Oman, Bahrain, and Qatar.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [License](#license)

## 🎯 Overview

The Reseller Engagement system is a comprehensive platform designed to:

- **Manage Credit Back Programs**: Define dynamic credit back rules with brackets and automatically calculate credits for reseller orders
- **Create & Send Promotions**: Target dormant/active resellers with promotional campaigns via WhatsApp
- **Track WhatsApp Interactions**: Log and analyze all WhatsApp messages (outbound promos, inbound queries, internal alerts)
- **Monitor Reseller Activity**: Segment resellers by activity status (Active, Dormant, Churned)
- **Provide Analytics**: Dashboard with KPIs, charts, and export capabilities

### Technology Stack

**Backend:**
- Node.js (v18+)
- Express.js
- Oracle Database (via oracledb driver)
- JWT Authentication
- Winston (logging)

**Frontend:**
- React 18
- Material-UI (MUI)
- Recharts (data visualization)
- React Router
- Axios

## ✨ Features

### F-001: Credit Back Engine
- Define dynamic rules with multiple percentage brackets
- Three modes: NEXT_ORDER, NEXT_WITHIN, ANYTIME
- Automatic credit calculation based on sales
- Complete ledger tracking (earned, redeemed, expired)
- Reseller credit balance queries

### F-002: Promotions Builder
- Select SKUs based on ERP logic (slow-moving, overstocked)
- Define promotional periods and offer prices
- Generate WhatsApp templates (English & Arabic)
- Target resellers by segmentation (dormant, active, all)
- Automated promo sending with frequency controls

### F-003: WhatsApp Integration
- Webhook endpoint for incoming messages
- Command parsing: AVAIL, ORDER, CREDIT, PROFILE
- Automatic responses with ERP data
- Reseller request creation and routing
- Simulated message sending (ready for WhatsApp Cloud API)

### F-004: Admin Dashboard
- KPI cards (resellers, credit outstanding, etc.)
- Sales trend charts
- Reseller segmentation pie chart
- WhatsApp engagement metrics
- Comprehensive management pages

### F-005: Analytics & KPIs
- Reseller segmentation statistics
- WhatsApp engagement rates
- Promo ROI tracking (baseline vs promo sales)
- CSV export for reports

## 🏗️ Architecture

```
┌─────────────┐
│   React     │ ◄─── Frontend (Port 5173)
│  Dashboard  │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────┐
│  Express    │ ◄─── Backend API (Port 3003)
│  Node.js    │
└──────┬──────┘
       │
       ├──► Oracle DB (ERP - SPINE_* tables)
       │
       └──► Oracle DB (Engagement - SALR_E_* tables)
```

### Database Architecture

**ERP Tables (existing - SPINE_*):**
- SPINE_RESELLER
- SPINE_SKU
- SPINE_SALES_ORDER
- SPINE_INVOICE
- SPINE_RECEIPT

**Engagement Tables (new - SALR_E_*):**
- SALR_E_CREDIT_BACK_RULE
- SALR_E_CREDIT_BACK_RULE_BRACKET
- SALR_E_CREDIT_BACK_LEDGER
- SALR_E_PROMO
- SALR_E_PROMO_SKU
- SALR_E_WHATSAPP_MESSAGE
- SALR_E_RESELLER_REQUEST
- SALR_E_ADMIN_CONFIG
- SALR_E_WHATSAPP_OTP_SESSION
- SALR_E_AUDIT_LOG

## 📦 Prerequisites

- **Node.js**: v18.0.0 or higher
- **Oracle Database**: 11g or higher
- **Oracle Instant Client**: Required for oracledb driver
- **npm**: v8.0.0 or higher

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Reseller-Engagement
```

### 2. Install Oracle Instant Client

Follow Oracle's official guide to install Instant Client for your OS:
- **macOS**: Use Homebrew or download from Oracle
- **Linux**: Install RPM/DEB packages
- **Windows**: Download and set PATH

### 3. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

## ⚙️ Configuration

### Backend Configuration

1. Copy the environment example file:

```bash
cd backend
cp .env.example .env
```

2. Edit `.env` with your settings:

```env
# Server
PORT=3003
NODE_ENV=development

# Oracle Database
ORACLE_USER=your_db_username
ORACLE_PASSWORD=your_db_password
ORACLE_CONNECT_STRING=localhost:1521/XEPDB1

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_at_least_32_chars_long

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Frontend Configuration

1. Copy the environment example file:

```bash
cd frontend
cp .env.example .env
```

2. Edit `.env`:

```env
VITE_API_BASE_URL=http://localhost:3003/api
```

## 🗄️ Database Setup

### 1. Run the Schema Script

Connect to your Oracle database and run the schema creation script:

```bash
sqlplus username/password@connect_string @backend/db/sql/salr_e_schema.sql
```

Or using SQL Developer / SQLcl:
```sql
@/path/to/backend/db/sql/salr_e_schema.sql
```

This will create:
- All SALR_E_* tables
- Indexes
- Views
- Default configuration data

### 2. Verify Tables

```sql
SELECT table_name FROM user_tables WHERE table_name LIKE 'SALR_E_%';
```

You should see 9 tables created.

### 3. ERP Tables (Spine)

**Note:** The application assumes your existing ERP (Spine) tables already exist:
- SPINE_RESELLER
- SPINE_SKU
- SPINE_SALES_ORDER
- SPINE_INVOICE

Adjust table/column names in `backend/src/repositories/erpRepository.js` to match your actual ERP schema.

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Backend will start on http://localhost:3003

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend will start on http://localhost:5173

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/logout` | Admin logout |
| GET | `/api/auth/validate` | Validate token |
| GET | `/api/auth/me` | Get current user |

### Credit Back Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/credit-back/rules` | Get all rules |
| GET | `/api/admin/credit-back/rules/:id` | Get rule by ID |
| POST | `/api/admin/credit-back/rules` | Create rule |
| PUT | `/api/admin/credit-back/rules/:id` | Update rule |
| POST | `/api/admin/credit-back/rules/:id/activate` | Activate rule |
| POST | `/api/admin/credit-back/rules/:id/deactivate` | Deactivate rule |
| GET | `/api/admin/credit-back/balance/:resellerId` | Get credit balance |
| POST | `/api/admin/credit-back/calculate` | Calculate credit (dry run) |
| POST | `/api/admin/credit-back/award` | Award credit |

### Promotions Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/promos` | Get all promos |
| GET | `/api/admin/promos/:id` | Get promo by ID |
| POST | `/api/admin/promos` | Create promo |
| PUT | `/api/admin/promos/:id` | Update promo |
| POST | `/api/admin/promos/:id/skus` | Add SKU to promo |
| POST | `/api/admin/promos/:id/send` | Send promo |
| GET | `/api/admin/promos/candidate-skus/:type` | Get candidate SKUs |

### Resellers Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/resellers` | Get all resellers |
| GET | `/api/admin/resellers/:id` | Get reseller details |
| GET | `/api/admin/resellers/stats/segmentation` | Get segmentation stats |

### WhatsApp Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/whatsapp/webhook` | WhatsApp webhook (public) |
| GET | `/api/admin/whatsapp/messages` | Get messages |
| GET | `/api/admin/whatsapp/stats` | Get message stats |
| POST | `/api/admin/whatsapp/test` | Send test message |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/analytics/overview` | Dashboard overview |
| GET | `/api/admin/analytics/sales-trend` | Sales trend data |
| GET | `/api/admin/analytics/whatsapp-engagement` | WhatsApp metrics |
| GET | `/api/admin/analytics/export/resellers` | Export resellers CSV |

## 🚢 Deployment

### Production Checklist

1. **Environment Variables:**
   - Set `NODE_ENV=production`
   - Use strong `JWT_SECRET` (minimum 32 characters)
   - Use strong `ADMIN_PASSWORD`
   - Configure production database credentials

2. **Database:**
   - Run schema script on production database
   - Configure connection pooling (adjust POOL_MIN/MAX)
   - Ensure proper indexes are created

3. **Backend:**
   ```bash
   cd backend
   npm install --production
   npm start
   ```

4. **Frontend:**
   ```bash
   cd frontend
   npm run build
   # Serve build/ folder with nginx or similar
   ```

5. **Security:**
   - Enable HTTPS
   - Configure proper CORS origins
   - Set secure cookie flags
   - Implement rate limiting
   - Enable helmet security headers

6. **Monitoring:**
   - Check logs in `backend/logs/`
   - Monitor database connection pool
   - Set up error tracking (e.g., Sentry)
   - Configure health check monitoring

### Nginx Example Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📁 Project Structure

```
Reseller-Engagement/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration (env, db, logger)
│   │   ├── middleware/      # Express middleware (auth, error handling)
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Authentication
│   │   │   ├── creditBack/  # Credit Back engine
│   │   │   ├── promo/       # Promotions
│   │   │   ├── whatsapp/    # WhatsApp integration
│   │   │   ├── reseller/    # Reseller management
│   │   │   └── analytics/   # Analytics & reporting
│   │   ├── repositories/    # Data access layer (ERP integration)
│   │   ├── routes/          # API routes
│   │   └── app.js           # Express app setup
│   ├── db/
│   │   └── sql/
│   │       └── salr_e_schema.sql  # Database schema
│   ├── .env.example
│   ├── package.json
│   └── server.js           # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   └── Layout/     # App layout & navigation
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── pages/          # Page components
│   │   │   ├── Auth/       # Login page
│   │   │   ├── Dashboard/  # Dashboard with KPIs & charts
│   │   │   ├── CreditBack/ # Credit Back rules management
│   │   │   ├── Promotions/ # Promotions management
│   │   │   ├── Resellers/  # Reseller list & details
│   │   │   ├── WhatsApp/   # WhatsApp logs
│   │   │   └── Settings/   # Admin settings
│   │   ├── services/       # API service layer
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # React entry point
│   ├── index.html
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🔧 Customization

### Adjusting ERP Table/Column Names

Edit `backend/src/repositories/erpRepository.js` and update the SQL queries to match your Spine ERP schema.

### Adding New Credit Back Modes

1. Add mode to database constraint: `backend/db/sql/salr_e_schema.sql`
2. Update calculation logic: `backend/src/modules/creditBack/creditBackService.js`
3. Update frontend dropdown: `frontend/src/pages/CreditBack/CreditBackPage.jsx`

### Integrating Real WhatsApp API

1. Sign up for WhatsApp Business API
2. Update `.env` with credentials:
   ```
   WHATSAPP_ENABLED=true
   WHATSAPP_ACCESS_TOKEN=your_token
   WHATSAPP_PHONE_ID=your_phone_id
   ```
3. Implement actual sending in `backend/src/modules/whatsapp/whatsappService.js`
4. Configure webhook URL in WhatsApp dashboard

## 🐛 Troubleshooting

### Oracle Connection Issues

```bash
# Check Oracle Instant Client installation
node -e "require('oracledb').getConnection()"

# Verify connection string
sqlplus username/password@connect_string
```

### Port Already in Use

```bash
# Change backend port
# Edit backend/.env: PORT=3004

# Change frontend port
# Edit frontend/vite.config.js: server.port
```

### CORS Errors

Ensure `CORS_ORIGIN` in backend `.env` matches frontend URL:
```
CORS_ORIGIN=http://localhost:5173
```

## 📞 Support

For issues, questions, or contributions, please contact the development team.

## 📝 License

Proprietary - All rights reserved

---

**Built with ❤️ for Sedar's Reseller Engagement Initiative**
