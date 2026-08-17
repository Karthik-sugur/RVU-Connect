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
- Review flagged content and moderation reports
- Maintain governance and compliance

---

## ✨ Key Features

### 🔑 Authentication System

| Capability | Description |
|---|---|
| **Email + Password** | RVU email-based registration and login |
| **Google Sign-In** | RVU domain-restricted Google OAuth |
| **Domain Enforcement** | Only `@rvu.edu.in` emails permitted — enforced in the client, the admin console, **and** `firestore.rules` |
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
│  Browse · RSVP · Save · Follow · Post projects       │
└─────────────────────────────────────────────────────┘
```

| Role | Permissions | Assignment |
|---|---|---|
| **Student** | View clubs/events/announcements, RSVP to events, post projects, save content, follow clubs | Default for all new users |
| **Club Core Member** | Create events & announcements, manage club info, control registrations | Host Request → Admin Approval |
| **School Representative** | Publish school updates, create events, manage school-level communication | Host Request → Admin Approval |
| **Super Admin** | Create clubs, approve requests, moderate content, manage users, configure site settings | System-assigned |

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
- **RSVP System** — Students mark **Going** or **Interested**; the RSVP is written to both `events/{id}/rsvps/{uid}` and `users/{uid}/rsvps/{eventId}`, and hosts can export their event's attendee list

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
- **Reaching Out** — Students contact the poster directly by email/phone, or via the project's external application link (a Google Form or similar)
- **Owner Controls** — Posters open or close their project to collaborators, and delete it when finished

> **Note:** applications are handled off-platform through the external link. There is no in-app
> application queue, review step, or accept/reject flow.

---

### 🛡️ Content Moderation

- Content flagging by users
- Review queue for administrators
- Administrative moderation actions
- Moderation flags surfaced to admins in a review queue

---

### ⚙️ Administrative Console

| Module | Capabilities |
|---|---|
| **User Management** | View users, manage permissions and roles |
| **Club Management** | Create clubs, assign leadership, manage approvals |
| **Event Management** | Review events, publish/unpublish content |
| **Host Requests** | Approve Club Core Members and School Representatives |
| **Site Settings** | Platform tags, banned words, and pre-publication review toggle |

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
│  Users │ Clubs │ Events │ Projects │ Moderation │
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
   
   Update the Firebase configuration in [`js/config.js`](js/config.js) with your project credentials:
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

## 🧪 Testing

```bash
npm install
npm test          # syntax check + Firestore rules tests (needs Java for the emulator)
npm run lint      # parse every ES module on its own
npm run test:rules
```

`tests/firestore.rules.test.js` runs against the Firestore emulator and covers the security
boundaries that matter most:

| Area | What is asserted |
|---|---|
| Privilege escalation | A user cannot self-grant `schoolRepApproved` / `clubCoreApproved` / `hostApproved`, on create or update |
| Role integrity | A user cannot create their profile as `superAdmin`, or change their own `role` |
| Domain gate | Non-`@rvu.edu.in` and unauthenticated accounts cannot read campus data |
| Club rosters | Ordinary students can read a club's core team; outsiders cannot |
| RSVPs | A student may write only their own RSVP; hosts and admins may read the event's list |
| Host requests | A user may only ever write `status: 'pending'` to their own request — no self-approval |

---

## 🧪 Demo Mode

The student app includes a **demo environment** (the *Explore demo* button on the landing page) for:

- 🎤 Faculty presentations and reviews
- 🖥️ Product demonstrations
- 🧪 Front-end development without Firebase credentials

Demo mode uses pre-loaded sample campus data and never writes to Firestore.

> **Do not treat a passing demo as a passing test.** The fixtures in `sample-data.js` use loose
> display dates (`"May 22"`, no year) rather than the `YYYY-MM-DD` format real records use, so
> date parsing, expiry filtering and chronological sorting all behave differently there. The
> Super Admin console deliberately does **not** load demo data — it shows live records only.

---

## 📁 Project Structure

```
rvuconnect-main/
├── index.html              # Student application entry point
├── admin.html              # Super Admin console entry point
├── styles.css              # Student application styles
├── admin.css               # Admin console styles
├── admin.js                # Admin console logic
├── sample-data.js          # Demo fixtures (student app demo mode only)
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Composite index definitions
├── js/
│   ├── main.js             # Event delegation and all action handlers
│   ├── ui.js               # Every view and modal (template strings)
│   ├── render-admin.js     # In-app club-core / school-rep dashboards
│   ├── services.js         # Firestore data layer (window.RVUFirebase)
│   ├── auth.js             # Session lifecycle, role predicates, polling
│   ├── router.js           # Routing, deep links, overlay dismissal
│   ├── state.js            # Global state and collections
│   ├── utils.js            # escapeHtml/safeUrl, formatting, form helpers
│   ├── validation.js       # Payload validation
│   ├── config.js           # Firebase + App Check configuration
│   ├── firebase-init.js    # Firebase SDK initialisation
│   ├── constants.js        # Roles, statuses, routes, email domain
│   ├── errors.js           # Error mapping and toasts
│   ├── dialogs.js, toast.js, logger.js, repository.js
├── tests/
│   └── firestore.rules.test.js   # Rules tests (emulator)
├── scripts/
│   └── check-syntax.mjs    # ES module parse check
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
| ✅ | Event System & RSVP | Complete — going / interested, stored per event and per user |
| ✅ | Announcement Publishing | Complete |
| ✅ | Project Collaboration | Complete |
| ✅ | Content Moderation | Complete |
| ✅ | Administrative Console | Complete |
| 🔜 | Audit Logging | Planned |
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
