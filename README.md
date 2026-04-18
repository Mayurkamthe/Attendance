# College Attendance Management System

A full-stack web application for managing college attendance with Admin and Teacher roles.

## Tech Stack
- **Backend:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Frontend:** EJS + Tailwind CSS
- **Excel:** ExcelJS
- **Messaging:** WhatsApp (wa.me links + optional Business API)
- **Auth:** JWT + express-session

## Features
- Admin: Full control over classes, teachers, students, attendance, reports
- Teacher: Mark/edit attendance, view records, send WhatsApp to parents
- Excel Export: Daily (P/A list) + Monthly (full matrix with %)
- Bulk student upload via Excel
- WhatsApp message to absent students' parents

## Setup

```bash
npm install
```

Create a `.env` file (copy from `.env.example`):
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/attendance_db
JWT_SECRET=your_secret
SESSION_SECRET=your_session_secret
ADMIN_EMAIL=admin@college.edu
ADMIN_PASSWORD=Admin@123
COLLEGE_NAME=Your College Name
COLLEGE_ADDRESS=Address
COLLEGE_PHONE=+91-...
COLLEGE_EMAIL=info@college.edu
WA_ENABLED=false
ATTENDANCE_START=08:00
ATTENDANCE_END=18:00
```

```bash
npm start
```

Visit `http://localhost:3000`

## Bulk Upload Excel Format
| Name | Roll Number | Parent Phone |
|------|-------------|--------------|
| John Doe | 101 | 9876543210 |

## Default Admin Login
- Email: `admin@college.edu`
- Password: `Admin@123`

Change these in `.env` before deploying.
