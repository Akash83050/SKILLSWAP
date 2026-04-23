# ⚡ SkillSwap — Setup Guide

## Prerequisites
- Node.js (v16+): https://nodejs.org
- MongoDB Community: https://www.mongodb.com/try/download/community

---

## 🚀 Quick Start (3 Steps)

### Step 1 — Install Dependencies
Open terminal in this folder and run:
```
npm install
```

### Step 2 — Start MongoDB
On Windows:
```
net start MongoDB
```
On Mac/Linux:
```
brew services start mongodb-community
```
Or just open the MongoDB app if installed.

### Step 3 — Start the Server
```
npm run dev
```
Then open: **http://localhost:5000**

---

## 📁 Project Structure
```
skillswap/
├── backend/
│   ├── models/       ← MongoDB schemas
│   ├── routes/       ← API endpoints
│   ├── middleware/   ← JWT auth
│   └── server.js     ← Main entry point
├── frontend/
│   ├── css/style.css ← All styles
│   ├── js/
│   │   ├── api.js    ← API helper
│   │   └── app.js    ← All UI logic
│   └── index.html    ← Single page app
└── package.json
```

## 🔗 API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/users/ | Get all users |
| GET | /api/users/matches | Get skill matches |
| PUT | /api/users/me | Update profile |
| GET | /api/projects/ | Get all projects |
| POST | /api/projects/ | Create project |
| POST | /api/requests/ | Send collab request |
| PUT | /api/requests/:id | Accept/Reject |
| GET | /api/messages/conversations | Get chats |
| POST | /api/messages/:userId | Send message |
