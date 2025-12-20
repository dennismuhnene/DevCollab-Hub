# DevCollab-Hub Blueprint

This document outlines the core features, technology stack, and data models for DevCollab-Hub, a platform designed to connect developers with projects and collaborators.

## 1. Core Features

- **User Authentication:** Secure sign-up and login using Firebase Authentication (email/password and Google OAuth).

- **Comprehensive User Profiles:** Developers can create and manage their profiles, showcasing:
    - Name, Bio, Years of Experience
    - Photo URL
    - Tech Stack & Professional Skills
    - Collaboration Preferences (goals, commitment level, preferred collaboration types, locations)
    - Links to external portfolios and social media.

- **Project & Role Creation:** Users can create and manage:
    - **Projects:** Detailed listings for an entire product or idea.
    - **Roles:** Specific, targeted posts for a single position or need within a project, including required skills, commitment level, and collaboration type.

- **User Dashboard:** A personalized central hub for each user, providing:
    - A snapshot of their public profile.
    - A summary of their created projects.
    - **Collaboration Hub:** A dedicated section to review developers who have expressed interest in their projects.
    - **AI-Powered Insights:** Users can generate on-demand analysis of interested developers, receiving an "Audience Summary," identification of "Potential Gaps," and "Actionable Advice" to improve their project listings or profile.

- **Intelligent Discovery Page:** A central hub for users to find projects, developers, and open roles (posts).
    - **Tri-View Toggle:** Seamlessly switch between viewing developers, projects, and roles.
    - **Advanced Filtering:** Filter results by tech stack, skills, years of experience, and more.
    - **Algorithmic Sorting:** Automatically prioritizes and sorts results based on a "match score," which calculates relevance based on the current user's profile, skills, and preferences.
    - **Search:** Full-text search across all discoverable items.

- **Collaboration Flow:** A structured process to foster meaningful connections:
    1.  **Express Interest:** A user finds a project and shows their interest.
    2.  **Review & Match:** The project owner is notified and can review the interested user's profile on their dashboard. They can then choose to "Match."
    3.  **Connect:** Upon matching, a notification is sent to both users, a chat is created, and they can begin communicating directly.

- **Real-time Notifications:** A system to alert users of important events, such as new matches.

- **Direct Messaging:** A real-time chat system, built with Firebase Firestore, for matched users to communicate and collaborate.

## 2. Technology Stack

- **Framework:** Next.js (with App Router)
- **Language:** TypeScript
- **Backend & Database:** Firebase (Authentication, Firestore, Storage)
- **Styling:** Tailwind CSS with shadcn/ui components
- **State Management:** React Hooks and Context API
- **AI Integration:** Google AI (Genkit) for providing advanced insights on the user dashboard.
- **Analytics:** Firebase Analytics to track user engagement and feature usage.

## 3. Data Models

### UserProfile
```typescript
{
  uid: string; // Firebase Auth UID
  name: string;
  email: string;
  photoURL?: string;
  bio?: string;
  techStack?: string[];
  skills?: string[];
  yearsOfExperience?: number;
  openForCollaboration?: boolean;
  collaborationGoals?: string[];
  commitmentLevel?: string;
  collaborationPreferences?: string[]; // e.g., 'Remote', 'On-site'
  locations?: string[];
  partnerFunctions?: string[];
  // Links, Timestamps, etc.
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
  requiredYearsOfExperience?: number;
  interestedUsers?: string[]; // Array of UIDs
  matchedUsers?: string[]; // Array of UIDs
  collaborationOpen?: boolean;
  // Timestamps, etc.
}
```

### Role (Post)
```typescript
{
  id: string; // Firestore Document ID
  ownerId: string;
  title: string;
  roleDescription: string;
  requiredTechStack?: string[];
  requiredSkills?: string[];
  requiredYearsOfExperience?: number;
  commitmentLevel?: string;
  collaborationType?: string; // 'Full-time', 'Part-time'
  partnerFunctions?: string[];
  locations?: string[];
  incentives?: 'Paid Contract' | 'Equity Share' | 'Revenue Share';
  // Timestamps, etc.
}
```

### Match
A `matches` collection where each document represents a connection.
```typescript
{
  id: string; // Firestore Document ID
  projectId: string;
  projectTitle: string;
  users: [string, string]; // [projectOwnerUID, collaboratorUID]
  createdAt: Timestamp;
}
```

### Notification
A sub-collection under each user's document.
```typescript
{
  id: string;
  type: 'match' | 'message';
  fromUserId: string;
  fromUserName: string;
  projectId?: string;
  projectTitle?: string;
  matchId?: string;
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
- `/projects` - View the user's own projects
- `/projects/new` - Create a new project form
- `/projects/[id]` - View a specific project's details
- `/projects/[id]/edit` - Edit an existing project
- `/roles/create` - Create a new role post
- `/roles/[roleId]` - View a specific role's details
- `/messages` - Main messages view
- `/messages/[matchId]` - A direct chat with a specific match
