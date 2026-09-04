# VitaSeed Backend API 🌱

This repository contains the backend services for the VitaSeed website.
It provides APIs for products, orders, and enquiries.

## 🚀 Tech Stack
- Node.js
- Express
- Firebase Admin SDK
- Firebase Firestore
- Render (Free Web Service)

## 📡 API Endpoints

### Products
GET /api/products

### Orders
POST /api/orders

### Contacts (Enquiries)
POST /api/contacts

## 🔐 Security Notes
- Firebase service account is stored in environment variables
- No secrets are committed to the repository

## 🧪 Development Status
This backend supports a teaser / MVP frontend.
Some features may evolve in future versions.

## 🩺 Health Check
GET /
Returns:
```json
{ "status": "VitaSeed API running" }

