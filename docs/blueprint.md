# DevCollab-Hub Blueprint

This document outlines the core features, technology stack, and data models for DevCollab-Hub, a platform designed to connect developers with projects and collaborators.

## 1. Core Features

- **User Authentication:** Secure sign-up and login using Firebase Authentication (email/password and Google OAuth).
- **User Profiles:** Developers can create and manage their profiles, showcasing:
    - Name, Bio, Years of Experience
    - Tech Stack (e.g., React, Node.js, Python)
    - Professional Skills (e.g., System Design, Agile Development)
    - Collaboration Preferences (goals, commitment level, availability)
    - Links to GitHub, Portfolio, and other social media.
- **Project Listings:** Users can create and manage project listings, detailing:
    - Project Title & Description
    - Required Tech Stack & Skills
    - Required Years of Experience
    - Project Stage (e.g., Idea, In Progress, Launched)
    - Open Roles & Collaboration Status
    - Incentives (e.g., Paid, Equity, For Fun)
- **Discover Page:** A central hub for developers to find projects and other developers.
    - **Dual-View Toggle:** Seamlessly switch between viewing projects and viewing developers.
    - **Advanced Filtering:** Filter results by tech stack, skills, and years of experience.
    - **Search:** Full-text search across titles, descriptions, names, and bios.
    - **Algorithmic Sorting:** Automatically prioritizes and sorts results based on how well they match the user's profile and preferences.
- **Real-time Chat:** Direct messaging between users to discuss projects and collaboration opportunities, built with Firebase Firestore.

## 2. Technology Stack

- **Framework:** Next.js (with App Router)
- **Language:** TypeScript
- **Backend & Database:** Firebase (Authentication, Firestore, Storage)
- **Styling:** Tailwind CSS with shadcn/ui components
- **State Management:** React Hooks (`useState`, `useContext`, `useEffect`)
- **Form Handling:** `react-hook-form` with `zod` for validation
- **AI Integration:** Google AI (Genkit) for the AI Bio generation feature.

## 3. Data Models

### UserProfile

```typescript
{
  uid: string; // Firebase Auth UID
  name: string;
  bio?: string;
  techStack?: string[];
  skills?: string[]; // Max 5
  yearsOfExperience?: number;
  openForCollaboration?: boolean;
  collaborationGoals?: string[];
  commitmentLevel?: string;
  versionControl?: { type: 'github' | 'gitlab' | 'bitbucket'; url: string; };
  portfolioUrl?: string;
  socials?: { type: 'linkedin' | 'twitter' | 'tiktok' | 'discord'; url: string; };
  extraLinks?: { type: string; url: string; }[]; // Max 3
  // Timestamps, etc.
}
```

### Project

```typescript
{
  id: string; // Firestore Document ID
  ownerId: string; // UID of the user who created it
  title: string;
  description: string;
  requiredTechStack?: string[];
  requiredSkills?: string[];
  requiredYearsOfExperience?: number;
  projectStage?: 'Idea' | 'Planning' | 'In Progress' | 'Launched';
  collaborationOpen?: boolean;
  roleRequirements?: { role: string; description: string; }[]; // E.g., { role: 'Frontend Dev', description: 'Build UI in React' }
  incentives?: 'Paid' | 'Equity' | 'Learning/Fun' | 'Not Specified';
  // Timestamps, etc.
}
```

### Chat

- **Conversations Collection:** Each document represents a chat between two users.
  - `participants`: `[uid1, uid2]`
- **Messages Sub-collection:** A sub-collection within each conversation document containing individual chat messages.
  - `senderId`, `text`, `timestamp`

## 4. Page Structure

- `/` - Landing Page
- `/login` - Sign-in/Sign-up Page
- `/profile` - View/Edit your own profile
- `/profile/[uid]` - View a specific user's public profile
- `/developers` - Discover other developers and projects (the main feed)
- `/projects/new` - Create a new project form
- `/projects/[id]` - View a specific project's details
- `/projects/[id]/edit` - Edit an existing project
- `/chat` - Main chat interface
- `/chat/[uid]` - A direct chat with a specific user
