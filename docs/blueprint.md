# DevCollab Hub Blueprint

This document outlines the core features, technology stack, and data models for DevCollab Hub, a platform designed to connect developers with projects and collaborators.

## 1. Core Features

- **User Authentication:** Secure sign-up and login using Firebase Authentication (email/password and Google OAuth).

- **Comprehensive User Profiles:** Users create and manage a detailed profile.
    - **Required Fields:**
        - `name`: Required for all users (min. 2 characters).
        - `versionControl.url`: Required for "Developer" profiles.
    - **Optional Fields:** A rich set of optional fields includes:
        - `location`, `bio`, `yearsOfExperience`
        - `skills` (up to 5), `techStack`
        - Collaboration settings: `openForCollaboration` status, `collaborationGoals`, `commitmentLevel`
        - External links: `portfolioUrl`, `socials`, and up to 3 custom links.

- **Dual-Entity Creation (Projects vs. Roles):** Users can create:
    - **Projects:** Public-facing listings for an entire idea, seeking a team.
    - **Roles:** Confidential, specific posts for a single need, allowing for discreet talent acquisition.

- **Intelligent Discovery Hub:** A central marketplace (`/developers`) to find projects, developers, and roles with advanced filtering.

- **Personalized User Dashboard:** A multi-faceted command center (`/dashboard`) with a collapsible sidebar to switch between views:
    - **Insights View:** The main dashboard containing several widgets:
        - **Your Profile Card:** A quick summary of the user's profile with an edit link.
        - **AI Insights Card:** An on-demand feature for users to generate a strategic analysis of developers who have engaged with their projects. It provides an "Audience Summary," identifies "Potential Gaps," and offers "Actionable Advice."
        - **My Projects Section:** A preview of the user's created projects with a link to create more.
        - **Collaboration Hub:** A dynamic section that appears when developers show interest in a project. It lists the interested users and provides direct actions to "View Profile" or "Match."
        - **Public Profile Preview:** A detailed preview of how the user's own profile appears to others on the platform, showing their bio, skills, preferences, and status.
    - **Engagements View:** A dedicated section to manage all formal advisory engagements.

- **Structured Connection & Matching Flow:**
    1.  **Express Interest:** A user shows interest in a project or role.
    2.  **Review & Match:** The creator reviews the interested user in their dashboard's Collaboration Hub and can initiate a "Match."
    3.  **Connect:** Upon matching, a notification is sent, and a private chat channel (`/messages`) is created.

- **Integrated Communication:** A real-time chat system for matched users.

- **Expert Advisory Marketplace:** A structured, four-phase system for expert consultations:
    - **Phase 1: Application & Vetting:** A formal application and admin review process for advisors.
    - **Phase 2: Discovery & Request:** A filterable marketplace (`/advisory`) for users to find and formally request sessions with approved advisors.
    - **Phase 3: The Engagement:** A central hub (`/engagements/[id]`) for active engagements, featuring integrated video calls (Google Meet) and scheduling.
    - **Phase 4: Review & Completion:** A two-way feedback system to build advisor reputation.

- **Administrative Oversight:** Systems for vetting advisor applications (`/admin/applications`) and managing user feedback.

- **Public-Facing Content:** A `/blogs` section for articles and community building.

## 2. Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Backend & Database:** Firebase (Authentication, Firestore, Storage)
- **Styling:** Tailwind CSS with shadcn/ui components
- **State Management:** React Hooks, Context API
- **AI Integration:** Google AI (Genkit) for dashboard insights.
- **Analytics:** Firebase Analytics.

## 3. Data Models

### UserProfile
```typescript
{
  uid: string; // Firebase Auth UID
  name: string; // REQUIRED (min 2 chars)
  email: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  techStack?: string[];
  skills?: string[]; // Max 5
  yearsOfExperience?: number;
  openForCollaboration?: boolean;
  collaborationGoals?: string[];
  commitmentLevel?: string;
  versionControl?: { type: string, url: string }; // URL is REQUIRED for developers
  portfolioUrl?: string;
  socials?: { type: string, url: string };
  extraLinks?: { type: string, url: string }[]; // Max 3
}
```

### Project
```typescript
{
  id: string; // Firestore Document ID
  ownerId: string;
  title: string;
  description: string;
  requiredTechStack?: string[];
  requiredSkills?: string[];
  interestedUsers?: string[]; // Array of UIDs
  matchedUsers?: string[]; // Array of UIDs
}
```

### Role
```typescript
{
  id: string; // Firestore Document ID
  ownerId: string;
  title: string;
  roleDescription: string;
  requiredSkills?: string[];
  commitmentLevel?: string;
}
```

### AdvisorApplication (Sub-collection under User)
```typescript
{
  id: string;
  headline: string;
  bio: string;
  specialties: string[];
  credentials: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
}
```

### Engagement
```typescript
{
  id: string; // Firestore Document ID
  developerId: string;
  advisorId: string;
  message: string;
  status: 'requested' | 'active' | 'completed' | 'declined';
  googleMeetLink?: string;
  calendarEventId?: string;
}
```

### Match
```typescript
{
  id: string; // Firestore Document ID
  users: [string, string]; // [user1_UID, user2_UID]
  createdAt: Timestamp;
}
```

### Notification (Sub-collection under User)
```typescript
{
  id: string;
  type: 'match' | 'message' | 'system';
  link: string; // URL to the relevant page
  read: boolean;
  createdAt: Timestamp;
}
```

## 4. Page Structure

- `/` - Landing Page
- `/login`, `/signup` - Auth pages
- `/dashboard` - Main hub for logged-in users
- `/profile` - View/Edit your own profile
- `/developers` - Main discovery page for developers, projects, and roles
- `/developers/[id]` - View a specific user's public profile
- `/projects/new` - Create a new project form
- `/projects/[id]` - View a specific project's details
- `/projects/[id]/edit` - Edit an existing project
- `/roles/create` - Create a new role post
- `/roles/[roleId]` - View a specific role's details
- `/messages` - Main messages view
- `/messages/[matchId]` - A direct chat with a specific match
- `/advisory` - The main discovery hub for finding advisors.
- `/advisory/[advisorId]/request` - Form to submit a formal engagement request.
- `/engagements/[engagementId]` - The central hub for a specific, active engagement.
- `/engagements/[engagementId]/review` - Page for submitting a review after completion.
- `/admin/applications` - Admin page for reviewing advisor applications.
- `/admin/applications/[userId]/[applicationId]` - Admin page for viewing a specific application.
- `/blogs` - Public-facing content and articles.
- `/d_blog` - Dashboard for blog administrators.
