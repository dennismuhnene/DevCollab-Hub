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

- **User Account Deletion & Data Integrity:** Users can permanently delete their account. The system ensures data integrity for other users by:
    - **Freezing associated Engagements:** The engagement status is changed to `participant_deleted`, and the UI becomes a read-only historical record for the remaining participant.
    - **Archiving associated Chats:** The chat interface indicates the user has left and disables further interaction, preserving the conversation history.

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
        - **Public Profile Preview:** A detailed preview of how the user's own main developer profile (`/profile`) appears to others on the platform.
        - **Public Advisory Profile Navigation:** Users can seamlessly view both their own and other users' public-facing advisory profiles (`/advisory/[id]`), ensuring consistent navigation and allowing advisors to see their own public presence.
    - **Engagements View:** A dedicated section to manage all formal advisory engagements.

- **Structured Connection & Matching Flow:**
    1.  **Express Interest:** A user shows interest in a project or role.
    2.  **Review & Match:** The creator reviews the interested user in their dashboard's Collaboration Hub and can initiate a "Match."
    3.  **Connect:** Upon matching, a notification is sent, and a private chat channel (`/messages`) is created.

- **Integrated Communication:** A real-time chat system for matched users.

- **Expert Advisory & Engagement System (Confidential & Outcome-Driven):** A structured system for private, milestone-based collaborations. Engagements are standalone, confidential contracts, not publicly tied to projects or roles.

    - **Phase 1: Advisor Supply-Side Setup**
        - **Application:** A formal application and admin review process for advisors.
        - **Standard Deliverables:** Advisors define a list of their core capabilities (e.g., "MVP Scope Definition," "Architecture Review"). These serve as building blocks for proposals.

    - **Phase 2: Engagement Request & Proposal Negotiation**
        1.  **Developer Initiates Request:** From an advisor's profile, a developer sends a confidential request including a context message, selected deliverables (from the advisor's list), a proposed timeline, and optional constraints. This is a request, not a booking.
        2.  **Advisor Responds:** The advisor has three options:
            - **Reject Immediately:** The request is closed.
            - **Accept As-Is:** The advisor defines milestones matching the developer's request and sends it for final confirmation.
            - **Propose a Structured Plan (Primary Path):** The advisor creates and sends a detailed counter-proposal with specific milestones (description, deliverable, timeline) and notes.
        3.  **Developer Decision Gate:** The developer reviews the advisor's proposal and has three options:
            - **Accept:** The engagement becomes `active`, and a private Engagement Room is created.
            - **Reject:** The engagement is `rejected` and permanently closed.
            - **Request Revision (One-Time Only):** The status becomes `revision_requested`. The developer sends feedback, and the proposal goes back to the advisor.
        4.  **Advisor's Final Response:** After a revision request, the advisor has two options:
            - **Reject:** The engagement is `rejected` and permanently closed.
            - **Resend Final Proposal:** The advisor makes adjustments and sends one last proposal. The status returns to `pending_developer_acceptance`.
        5.  **Developer's Final Decision:** Faced with the revised proposal, the developer can only:
            - **Accept:** The engagement becomes `active`.
            - **Reject:** The engagement is `rejected`. There are no more revisions.

    - **Phase 3: Execution in the Engagement Room**
        - Upon acceptance, a private, confidential **Engagement Room** (`/engagements/[id]`) is created.
        - **Contents:** The room contains an integrated Chat, a read-only **Milestone Panel**, a timeline overview, and a private **Outcome Log**.
        - **Confidentiality:** There are explicitly **no links** to public projects, ensuring complete privacy.

    - **Phase 4: Milestone Tracking & Outcome Logging**
        - **Lightweight Accountability:** The milestone tracking is not a project management tool. It's a simple accountability scaffold.
        - **Flow:** An advisor marks a milestone as `Submitted`. The developer then reviews it. They can `Accept` it (which marks it complete and triggers the Outcome Log) or `Request Clarification` via the chat without resetting the milestone's state.
        - **Automated Outcome Logging:** Each accepted milestone automatically creates a **Private Engagement Outcome Entry** in the Outcome Log. This entry contains the milestone description, a required summary from the advisor, and an optional reflection from the developer.

    - **Phase 5: Post-Engagement Closure & Intelligence**
        - **Completion:** Once all milestones are accepted, the engagement is marked "Completed."
        - **Review:** A two-way, confidential review process is initiated.
        - **Reputation & Progress Tracking:**
            - **For Advisors:** The system internally tracks metrics like deliverables completed, acceptance rates, and revision frequency. This builds a reputation score based on execution, giving their "Standard Deliverables" a credibility weight.
            - **For Developers:** The platform tracks a private history of completed engagements, deliverables achieved, and time-to-completion patterns. This provides a valuable record of their progress and decisions.

- **Non-Intrusive AI Coach (New & Separate):** A new AI system that operates at the engagement meta-level without reading content. Its role is to act as a private coach.
    - **Capabilities:**
        - Detect stalled engagements (based on milestone inactivity).
        - Flag repeated revision requests as a potential mismatch.
        - Privately summarize completed outcomes for the developer.
        - Recommend the next type of advisor based on the developer's engagement history.

- **Administrative Oversight:** Systems for vetting advisor applications (`/admin/applications`) and managing user feedback.

- **Public-Facing Content:** A `/blogs` section for articles and community building.

## 2. Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Backend & Database:** Firebase (Authentication, Firestore, Storage)
- **Styling:** Tailwind CSS with shadcn/ui components
- **State Management:** React Hooks, Context API
- **AI Integration:** Google AI (Genkit). Used for two **separate** features: the public project dashboard insights and the new, non-intrusive engagement AI coach.
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
  standardDeliverables?: string[]; // NEW: Advisor-defined capabilities
  verificationStatus: 'pending' | 'verified' | 'rejected';
}
```

### Engagement
```typescript
{
  id: string; // Firestore Document ID
  developerId: string;
  advisorId: string;
  status: 'pending_proposal' | 'pending_developer_acceptance' | 'revision_requested' | 'active' | 'completed' | 'rejected' | 'participant_deleted';
  developerRequest: {
    message: string;
    selectedDeliverables: string[];
    proposedTimeline: string;
    constraints?: string;
  };
  advisorProposal?: {
    milestones: {
        id: string;
        description: string;
        deliverable: string;
        timeline: string;
        status: 'pending' | 'in_progress' | 'submitted' | 'accepted'; // Milestone-specific status
    }[];
    notes?: string;
  };
  outcomeLog?: {
    milestoneId: string;
    milestoneDescription: string;
    advisorSummary: string;
    developerReflection?: string;
    completedAt: Timestamp;
  }[];
  googleMeetLink?: string; // Optional
  calendarEventId?: string; // Optional
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
  type: 'match' | 'message' | 'system' | 'engagement_update';
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
- `/engagements` - A new central page to manage all engagement requests and active engagements.
- `/engagements/[engagementId]` - The private Engagement Room for a specific, active engagement.
- `/admin/applications` - Admin page for reviewing advisor applications.
- `/admin/applications/[userId]/[applicationId]` - Admin page for viewing a specific application.
- `/blogs` - Public-facing content and articles.
- `/d_blog` - Dashboard for blog administrators.