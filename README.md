# 🏋️ GearUp API - Sports Equipment Rental Platform

<div align="center">

**A Production-Ready Backend for Sports & Outdoor Gear Rentals**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.0-lightgrey)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.0-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-ISC-orange)](LICENSE.md)

[Features](#-features) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Architecture](#-architecture) • [Deployment](#-deployment)

</div>

---

## Overview

**GearUp** is a comprehensive sports and outdoor equipment rental platform that connects customers with gear providers. Our robust REST API enables users to browse equipment, place rental orders, process secure payments, and manage their entire rental workflow through three distinct user roles.

### Perfect For
- **Sports Equipment Rental Services**
- **Outdoor Adventure Companies**  
- **Event Rental Businesses**
- **College/University Equipment Centers**
- **Tourism & Activity Providers**

---

## Features

### **Advanced Authentication & Security**
- **JWT-based Authentication** with httpOnly cookies for enhanced security
- **Role-Based Access Control** (Customer, Provider, Admin)
- **Password Strength Validation** with bcrypt hashing
- **Rate Limiting** to prevent API abuse
- **CORS Configuration** for secure cross-origin requests

### **Comprehensive Gear Management**
- **Advanced Search & Filtering** by category, price, brand, availability
- **Real-time Stock Management** with automatic availability checking
- **Multi-tier Pricing** (daily, weekly, monthly rates)
- **Flexible Specifications** using JSON for gear-specific attributes
- **Image Upload Support** with URL arrays
- **Category Organization** for easy browsing

### **Smart Rental System**
- **Intelligent Availability Checking** prevents double-booking
- **Flexible Rental Periods** (1-30 days) with date validation
- **Multi-item Orders** with automatic pricing calculation
- **Complete Order Workflow**: PLACED → CONFIRMED → PAID → PICKED_UP → RETURNED
- **Order Cancellation** with automatic stock restoration
- **Pickup/Return Address** management

### **Secure Payment Processing**
- **Stripe Integration** for secure payment processing
- **Payment Intent Creation** with automatic currency handling
- **Payment Status Tracking** (PENDING, COMPLETED, FAILED, REFUNDED)
- **Payment History** with detailed transaction records
- **Webhook Support** for payment confirmation

### **Customer Reviews System**
- **Post-Rental Reviews** with 5-star rating system
- **Review Validation** (only after gear return)
- **Comment System** with character limits
- **Review Management** (update, delete your own reviews)
- **Gear Rating Aggregation** for reputation tracking

### **Admin Dashboard**
- **Platform Analytics** with comprehensive statistics
- **User Management** (activate/deactivate accounts)
- **Platform-wide Gear Oversight**
- **All Rental Order Monitoring**
- **Revenue & Payment Tracking**
- **Dashboard Statistics** with real-time metrics

### **API Documentation**
- **Interactive Swagger UI** at `/api-docs`
- **Comprehensive Endpoint Documentation**
- **Request/Response Examples**
- **Authentication Instructions**
- **Error Response Documentation**

---

## Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **PostgreSQL** database (local or cloud)
- **Stripe** account (for payment processing)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/gearup-backend.git
cd gearup-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Set up database
npm run prisma:generate
npm run prisma:push

# 5. Seed database (optional)
npm run prisma:seed

# 6. Start development server
npm run dev
```

### Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gearup_db

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Stripe Payment Gateway
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# CORS & Security
CORS_ORIGIN=http://localhost:3000
```

---

##  API Documentation

### Interactive Documentation
Once the server is running, visit **`http://localhost:5000/api-docs`** for interactive API documentation with Swagger UI.

### Core Endpoints

####  **Authentication**
```typescript
POST   /api/auth/register     // User registration with role selection
POST   /api/auth/login        // User login with JWT token
GET    /api/auth/me          // Get current authenticated user
POST   /api/auth/logout      // Logout and clear cookies
```

####  **Gear Management**
```typescript
GET    /api/gear                    // Browse all gear with filters
GET    /api/gear/search            // Search gear items
GET    /api/gear/:id               // Get gear details
GET    /api/categories/all         // Get all categories
GET    /api/categories/:id         // Get category with gear
POST    /api/gear                  // Add gear (Provider only)
PUT    /api/gear/:id              // Update gear (Provider only)
DELETE /api/gear/:id              // Delete gear (Provider only)
```

####  **Rental Orders**
```typescript
POST   /api/rentals                  // Create rental order
GET    /api/rentals                 // Get user's rental orders
GET    /api/rentals/:id             // Get rental order details
PATCH  /api/rentals/:id/status      // Update order status (Provider/Admin)
POST   /api/rentals/:id/cancel      // Cancel rental order
```

####  **Payments**
```typescript
POST   /api/payments/create         // Create payment session
POST   /api/payments/confirm        // Confirm payment
GET    /api/payments                // Get payment history
GET    /api/payments/:id            // Get payment details
```

#### **Reviews**
```typescript
POST   /api/reviews                 // Create review
GET    /api/reviews/gear/:gearId    // Get gear reviews
GET    /api/reviews/:id             // Get review details
PATCH  /api/reviews/:id            // Update review
DELETE /api/reviews/:id            // Delete review
```

#### **Admin Dashboard**
```typescript
GET    /api/admin/dashboard         // Platform statistics
GET    /api/admin/users            // Get all users
GET    /api/admin/users/:id        // Get user details
PATCH  /api/admin/users/:id/status // Update user status
GET    /api/admin/gear             // Get all gear
GET    /api/admin/rentals          // Get all rental orders
```

---

## Architecture

### Project Structure
```
src/
├── config/              
│   ├── database.ts      
│   ├── env.config.ts    
│   ├── stripe.config.ts 
│   └── swagger.ts      
│
├── middlewares/         
│   ├── auth.middleware.ts       
│   ├── role.middleware.ts       
│   ├── validation.middleware.ts 
│   └── rateLimit.middleware.ts  
│
├── modules/            
│   ├── auth/           
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.validator.ts
│   │   └── auth.interface.ts
│   │
│   ├── gear/           
│   ├── rental/        
│   ├── payment/       
│   ├── review/        
│   └── admin/         
│
├── utils/             
│   ├── apiResponse.util.ts    
│   ├── password.util.ts      
│   ├── token.util.ts         
│   ├── availability.util.ts  
│   └── errors.util.ts        
│
├── lib/                
│   └── prisma.ts       
│
├── app.ts              
└── server.ts           
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js  | JavaScript runtime |
| **Framework** | Express  | Web application framework |
| **Language** | TypeScript | Type-safe development |
| **Database** | PostgreSQL  | Relational database |
| **ORM** | Prisma  | Database toolkit |
| **Authentication** | JWT + httpOnly cookies | Secure authentication |
| **Validation** | express-validator | Input validation |
| **Payment** | Stripe  | Payment processing |
| **Security** | bcryptjs, CORS, rate-limiting | Security measures |
| **Documentation** | Swagger/OpenAPI | API documentation |

---

##  User Roles & Permissions

### **Customer** 
- Browse and search available gear
- Place rental orders with multiple items
- Make secure payments via Stripe
- Track rental order status
- Cancel orders (before confirmation)
- Leave reviews after gear return
- Manage personal information

### **Provider**
- All Customer permissions, plus:
- Add/edit/delete gear from inventory
- Set pricing (daily/weekly/monthly rates)
- Manage stock and availability
- View incoming rental orders
- Update order status (confirm, pick up, return)
- Track gear performance and reviews

### **Admin** 
- All Provider permissions, plus:
- Platform-wide user management
- View all gear listings and orders
- Update user account status (activate/deactivate)
- Access comprehensive dashboard statistics
- Monitor platform revenue and analytics
- Manage categories and platform settings

---

##  Security Features

### Authentication & Authorization
- **JWT Tokens** stored in httpOnly cookies
- **Role-Based Access Control** with middleware protection
- **Password Strength Requirements** (uppercase, lowercase, numbers)
- **Secure Password Hashing** with bcryptjs

### API Security
- **Rate Limiting** on authentication endpoints
- **Input Validation** on all endpoints using express-validator
- **SQL Injection Prevention** via Prisma ORM
- **CORS Configuration** for cross-origin security
- **Request Size Limits** to prevent DoS attacks

### Data Protection
- **Environment Variable Management** for sensitive data
- **Password Never Exposed** in API responses
- **User Data Isolation** between roles
- **Transaction Integrity** for payment processing

---

## Testing the API

### Using Swagger UI
1. Start the server: `npm run dev`
2. Visit: `http://localhost:5000/api-docs`
3. Use the "Try it out" feature for each endpoint

### Using cURL
```bash
# Health Check
curl http://localhost:5000/health

# Register New User
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "Password123",
    "name": "John Doe",
    "role": "CUSTOMER"
  }'

# Browse Gear
curl http://localhost:5000/api/gear

# Get Categories
curl http://localhost:5000/api/categories/all
```

### Using Postman/Thunder Client
1. Import the API collection from `/api-docs`
2. Set up environment variables
3. Test endpoints with proper authentication
4. Use cookie jar for authenticated requests

---

## Database Schema

### Core Entities
- **Users** - Customer, Provider, Admin accounts
- **Categories** - Gear categorization (Cycling, Camping, Fitness, etc.)
- **GearItems** - Equipment inventory with pricing and availability
- **RentalOrders** - Rental transactions with status tracking
- **RentalOrderItems** - Individual items within rental orders
- **Payments** - Payment transaction records
- **Reviews** - Customer feedback and ratings

### Key Features
- **Proper Indexing** for performance optimization
- **Foreign Key Constraints** for data integrity
- **UUID Primary Keys** for distributed system compatibility
- **JSON Fields** for flexible data storage
- **Enum Types** for status and role management

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Gear items retrieved successfully",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Gear item not found",
  "error": "No gear item exists with the provided ID"
}
```

---

## Deployment

### Development
```bash
npm run dev          
npm run build        
npm start           
```

### Production Deployment

**Option 1: Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Option 2: Render**
```bash
# Connect GitHub repo to Render
# Set environment variables in Render dashboard
# Auto-deploys on git push
```

**Option 3: Railway**
```bash
# Install Railway CLI
npm i -g railway

# Deploy
railway login
railway link
railway up
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET` (32+ characters)
- Configure production `DATABASE_URL`
- Add real `STRIPE_SECRET_KEY`
- Set proper `CORS_ORIGIN`

---

## Monitoring & Maintenance

### Health Check
```bash
curl http://your-domain.com/health
```

### Database Management
```bash
npm run prisma:studio    # Open Prisma Studio
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:push      # Push schema changes
```

### Logging
- Development: Request logging enabled
- Production: Structured JSON logs
- Error tracking: Comprehensive error handling

---

