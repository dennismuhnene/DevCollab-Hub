
# DevCollab Hub - Project Blueprint

## 1. Project Overview

DevCollab Hub is a web application designed to connect developers with each other and with projects. It serves as a social platform where users can showcase their profiles, list their projects, and find collaborators. The platform facilitates discovery through filters and an AI-powered recommendation system, and it includes messaging features for communication.

## 2. Tech Stack

- **Frontend:** Next.js (React Framework)
- **Backend:** Firebase (Authentication, Firestore Database, Storage)
- **Styling:** Tailwind CSS with Radix UI components
- **AI/ML:** Genkit (with Google Gemini)
- **Languages:** TypeScript
- **Deployment:** Vercel / Next.js hosting with Firebase backend

## 3. Key Features

### User Authentication
- Sign up, log in, and password reset functionality.
- User sessions are managed through Firebase Authentication.

### Developer & Project Discovery
- **View Modes:** Users can switch between viewing developer profiles and project listings.
- **Filtering:** Results can be filtered by:
  - Technology stack
  - Professional skills
  - Years of experience
- **Search:** Full-text search for developers and projects.
- **AI Sorting:** An AI-powered feature to sort and rank results based on relevance to the user's profile or projects.

### Profiles
- **Developer Profiles:** 
  - Name, bio, profile picture.
  - Tech stack, skills, years of experience.
  - Links to social/professional accounts (e.g., GitHub, LinkedIn).
- **Project Pages:**
  - Project title, description, and images/media.
  - Required tech stack, skills, and experience level.
  - Owner/collaborator information.

### Collaboration & Communication
- **Matching:** A system for creating matches or connections between users (details in `src/lib/firebase/matches.ts`).
- **Messaging:** Real-time chat between matched users.
- **Notifications:** In-app notifications for important events (e.g., new messages, match requests).

### Content
- **Blog:** A public-facing blog for articles and updates.
- **Content Management:** A simple admin interface for creating and editing blog posts.

## 4. Data Models (Firestore)

- **users:**
  - `uid` (string)
  - `name` (string)
  - `email` (string)
  - `bio` (string)
  - `techStack` (array of strings)
  - `skills` (array of strings)
  - `yearsOfExperience` (number)
  - ... and other profile information.

- **projects:**
  - `id` (string)
  - `ownerId` (string)
  - `title` (string)
  - `description` (string)
  - `requiredTechStack` (array of strings)
  - `requiredSkills` (array of strings)
  - `requiredYearsOfExperience` (number)

- **matches:**
  - `id` (string)
  - `userIds` (array of two strings)
  - `status` (string, e.g., 'pending', 'accepted')

- **messages:**
  - Subcollection under a `matches` document.
  - `id` (string)
  - `senderId` (string)
  - `text` (string)
  - `timestamp` (timestamp)

## 5. AI-Powered Features (Genkit)

The application leverages Genkit with a Google Gemini model for several intelligent features:

- **`get-chat-insights`:** Analyzes chat conversations to extract insights.
- **`get-profile-insights`:** Generates insights from a user's profile data.
- **`get-user-recommendations`:** Provides developer or project recommendations.
- **`project-description-generator`:** Assists users in writing compelling project descriptions.
- **`user-skills-summarizer`:** Summarizes a user's skills.

These AI flows are defined in `src/ai/flows/` and are exposed via an API route (`/api/ai/sort`).

## 6. Project Structure

- **`src/app/`:** Contains the main application routes, organized by route groups: `(auth)`, `(main)`, `(public)`, etc.
- **`src/components/`:** Reusable React components used throughout the application.
  - `ui/`: Generic UI components (e.g., Button, Card, Input).
- **`src/lib/`:** Shared libraries and utility functions.
  - `firebase/`: Firebase configuration, actions, and hooks.
  - `hooks/`: Custom React hooks.
- **`src/firebase/`:** Firebase-specific providers and configuration.
- **`src/ai/`:** Genkit AI flows and related logic.
- **`public/`:** Static assets like images and HTML files.
- **`functions/`:** Firebase Cloud Functions (if any, though most logic seems client-side or in Next.js API routes).
- **`docs/`:** Project documentation, including this blueprint.
