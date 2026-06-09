<p align="center">
  <img src="assets/rv-university-logo-gold.png" alt="RV University Logo" width="120" />
</p>

<h1 align="center">RVU Connect</h1>

<p align="center">
  <strong>The Digital Campus Operating System for RV University</strong>
</p>

<p align="center">
  <em>Centralized student engagement · Club management · Event discovery · Project collaboration</em>
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-database-schema">Database</a> •
  <a href="#-security">Security</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

## 📌 Overview

**RVU Connect** is a centralized digital campus platform built for **RV University** that unifies clubs, events, announcements, projects, students, and university communities into a single, cohesive system.

It serves as a university-wide operating layer for student engagement — enabling students to discover opportunities, join communities, participate in events, collaborate on projects, and stay informed about everything happening on campus.

> **Why RVU Connect?**  
> Traditional campus communication is fragmented across WhatsApp groups, Instagram pages, emails, and spreadsheets. RVU Connect replaces this chaos with a unified platform featuring structured workflows, role-based permissions, and administrative oversight.

---

## 🧩 Problem Statement

Most university ecosystems suffer from critical inefficiencies:

| Problem | Impact |
|---|---|
| Information scattered across multiple platforms | Students miss opportunities they never discover |
| Low visibility for clubs and initiatives | Clubs struggle to reach relevant audiences |
| Poor event discovery | Low participation in campus activities |
| Inefficient project recruitment | Talent goes unmatched with opportunities |
| Lack of accountability in student organizations | Poor governance and follow-through |
| No centralized record of campus activity | Administrators lack visibility |
| Manual approval and management workflows | Slow, error-prone processes |

**RVU Connect addresses all of these issues by creating a centralized campus engagement system.**

---

## 🎯 Key Objectives

### 🎓 For Students
- Discover events and opportunities
- Join and follow clubs & organizations
- Apply for collaborative projects
- Save content for later
- Build campus visibility through participation

### 🏛️ For Clubs
- Publish events and announcements
- Manage registrations and recruitment
- Build club identity and digital presence
- Track member engagement

### 🏫 For School Representatives
- Share school-level updates and academic activities
- Manage departmental engagement
- Announce school-specific events

### 🔐 For Administrators
- Moderate all platform content
- Manage clubs, events, and user roles
- Approve leadership and host requests
- Track activity with audit logs
- Maintain governance and compliance

---

## ✨ Key Features

### 🔑 Authentication System

| Capability | Description |
|---|---|
| **Email + Password** | RVU email-based registration and login |
| **Google Sign-In** | RVU domain-restricted Google OAuth |
| **Domain Enforcement** | Only `@rvu.edu.in` emails permitted |
| **Role-Based Access** | Permissions tied to user roles |
| **Firestore Rules** | Server-side security enforcement |

---

### 👤 Student Profiles

Students create profiles containing:
- **Personal Info** — Name, school, academic year
- **Interests** — Tags for discovery and recommendations
- **Role Information** — Current roles and affiliations

Profiles power discovery, applications, event participation, and community engagement.

---

### 🛡️ Role System

The platform implements a hierarchical role system with four tiers:

```
┌─────────────────────────────────────────────────────┐
│                   Super Admin                       │
│  Full platform control · User management · Audits   │
├─────────────────────────────────────────────────────┤
│          School Representative                      │
│  School updates · Academic events · Dept. comms     │
├─────────────────────────────────────────────────────┤
│            Club Core Member                         │
│  Club events · Announcements · Member management    │
├─────────────────────────────────────────────────────┤
│                  Student                            │
│  Browse · RSVP · Apply · Save · Follow              │
└─────────────────────────────────────────────────────┘
```

| Role | Permissions | Assignment |
|---|---|---|
| **Student** | View clubs/events/announcements, apply for projects, RSVP, save content | Default for all new users |
| **Club Core Member** | Create events & announcements, manage club info, control registrations | Host Request → Admin Approval |
| **School Representative** | Publish school updates, create events, manage school-level communication | Host Request → Admin Approval |
| **Super Admin** | Create clubs, approve requests, moderate content, manage users, access audit logs | System-assigned |

---

### 🏢 Club Management

- **Club Profiles** — Name, description, activities, highlights, registration links, leadership info
- **Core Member Management** — President, Founder, Faculty Advisor, and Core Team roles
- **Registration Control** — Open/close recruitment periods directly from the platform
- **Nested Storage** — Core members stored under `clubs/{clubId}/coreMembers`

---

### 📅 Event System

- **Event Creation** — Authorized hosts create club or school events with full details (title, description, date, time, location, tags)
- **Event Discovery** — Browse, search, and filter events across campus
- **RSVP System** — Students mark attendance intent; the system maintains participation records

---

### 📢 Announcement System

Organizations can publish:
- General updates and notices
- Recruitment drives
- Deadline reminders
- Categorized information with publishing controls and admin moderation

---

### 🤝 Project Collaboration

- **Create Projects** — Define title, description, required skills, contact info, and application deadlines
- **Application Workflow** — Students submit applications; project owners review, accept, or reject
- **Status Tracking** — Both applicants and owners track application progress

---

### 🛡️ Content Moderation

- Content flagging by users
- Review queue for administrators
- Administrative moderation actions
- Full audit logging for accountability

---

### ⚙️ Administrative Console

| Module | Capabilities |
|---|---|
| **User Management** | View users, manage permissions and roles |
| **Club Management** | Create clubs, assign leadership, manage approvals |
| **Event Management** | Review events, publish/unpublish content |
| **Host Requests** | Approve Club Core Members and School Representatives |
| **Audit Logs** | Track all administrative actions for governance |

---

## 🏗️ Architecture

### Frontend

> **Vanilla JavaScript Single Page Application (SPA)**

| Technology | Purpose |
|---|---|
| HTML5 | Semantic structure |
| CSS3 | Styling and responsive design |
| JavaScript (ES Modules) | Application logic |

**Architecture Pattern:**
- State-driven rendering
- Single-page application with client-side routing
- Event delegation system for efficient DOM management

### Backend — Firebase

| Service | Purpose |
|---|---|
| **Firebase Authentication** | Email login, Google OAuth, session management |
| **Cloud Firestore** | Primary NoSQL database for all platform data |
| **Firebase Hosting** | Hosts both the student application and admin console |

```
┌──────────────────────────────────────────────────┐
│                   Client Layer                   │
│         HTML5 + CSS3 + Vanilla JS (SPA)          │
├──────────────────────────────────────────────────┤
│                 Firebase SDK                     │
│    Auth  │  Firestore  │  Hosting                │
├──────────────────────────────────────────────────┤
│               Cloud Firestore                    │
│  Users │ Clubs │ Events │ Projects │ Audit Logs  │
└──────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Top-Level Collections

| Collection | Description |
|---|---|
| `users` | Student profiles, roles, and account data |
| `clubs` | Club profiles, descriptions, and metadata |
| `events` | Event details, dates, locations, and tags |
| `announcements` | Published updates and notices |
| `projects` | Collaborative project listings |
| `hostRequests` | Pending role elevation requests |
| `moderationFlags` | Flagged content for review |
| `auditLogs` | Administrative action records |
| `contentReviews` | Moderation review history |
| `schools` | School/department information |
| `siteSettings` | Platform configuration |
| `superAdmins` | Super admin registry |

### Nested Subcollections

```
users/{uid}/
  ├── savedItems          # Bookmarked content
  ├── followedClubs       # Club subscriptions
  ├── rsvps               # Event RSVPs
  └── applications        # Project applications

events/{eventId}/
  └── rsvps               # Event attendance records

projects/{projectId}/
  └── applications        # Project applications

clubs/{clubId}/
  └── coreMembers         # Club leadership roster

schools/{schoolId}/
  └── representatives     # School representatives
```

---

## 🔐 Security

Security is enforced through **Firestore Security Rules** following a **default-deny** model.

| Control | Description |
|---|---|
| **Role Validation** | Actions restricted by user role |
| **Ownership Validation** | Users can only modify their own data |
| **Email Verification** | RVU email domain enforcement |
| **Field-Level Restrictions** | Granular update controls per field |
| **Admin Privilege Checks** | Elevated actions require admin verification |

The complete security rules are defined in [`firestore.rules`](firestore.rules).

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase project with Authentication and Firestore enabled
- Node.js (optional, for local development tooling)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Karthik-sugur/RVU-Connect.git
   cd RVU-Connect
   ```

2. **Configure Firebase**
   
   Update the Firebase configuration in [`firebase.js`](firebase.js) with your project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Run Locally**
   
   Open `index.html` in a browser, or use a local server:
   ```bash
   npx serve .
   ```

5. **Load Sample Data** *(Optional)*
   
   Use [`sample-data.js`](sample-data.js) to populate the database with demo campus data for testing.

---

## 🧪 Demo Mode

The application includes a built-in **demo environment** for:

- 🎤 Faculty presentations and reviews
- 🖥️ Product demonstrations
- 🧪 Development and QA testing

Demo mode uses pre-loaded sample campus data without interacting with production records, making it safe for showcases.

---

## 📁 Project Structure

```
rvuconnect-main/
├── index.html              # Main student application entry point
├── script.js               # Core SPA logic and routing
├── styles.css              # Student application styles
├── admin.html              # Admin console entry point
├── admin.js                # Admin console logic
├── admin.css               # Admin console styles
├── firebase.js             # Firebase configuration and services
├── firestore.rules         # Firestore security rules
├── sample-data.js          # Demo/sample data loader
└── assets/
    └── rv-university-logo-gold.png   # University branding
```

---

## 🗺️ Roadmap

| Phase | Feature | Status |
|---|---|---|
| ✅ | Authentication & Onboarding | Complete |
| ✅ | Role Management System | Complete |
| ✅ | Club Management | Complete |
| ✅ | Event System & RSVP | Complete |
| ✅ | Announcement Publishing | Complete |
| ✅ | Project Collaboration | Complete |
| ✅ | Content Moderation | Complete |
| ✅ | Administrative Console | Complete |
| ✅ | Audit Logging | Complete |
| 🔜 | Push Notifications | Planned |
| 🔜 | Event Check-In System | Planned |
| 🔜 | Advanced Search & Filters | Planned |
| 🔜 | Analytics Dashboard | Planned |
| 🔜 | Recommendation Engine | Planned |
| 🔜 | Mobile Application | Planned |

---

## 🌟 Vision

> **RVU Connect aims to become the digital operating system for student life at RV University.**

By centralizing opportunities, communication, communities, and collaboration into one platform, RVU Connect creates a more **connected**, **discoverable**, and **efficient** campus ecosystem — where no student misses an opportunity, no club goes unnoticed, and every initiative finds its audience.

---

<p align="center">
  Built with ❤️ for <strong>RV University</strong>
</p>
