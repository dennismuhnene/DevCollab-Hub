# **App Name**: DevCollab Hub

## Core Features:

- User Authentication: Secure user authentication using email/password with password reset functionality, protected by route guards.
- Profile Management: Users can create and manage their profiles, including uploading profile images to Firebase Storage.
- Project Listing: Users can create, update, and delete projects with details stored in Firestore. Supports image uploads to Firebase Storage.
- Matching System: Users can express interest in projects, triggering notifications via Cloud Functions. A match document is created upon agreement.
- AI Recommendations: Leverage Vertex AI embeddings for user and project similarity. Expose an endpoint for ranked recommendations using a similarity tool.
- Account Deletion Cleanup: Cloud Function triggers to delete user projects and associated storage files upon account deletion.
- Firestore Security: Firestore security rules that sanitize inputs and authorize access based on user roles and ownership.

## Style Guidelines:

- Primary color: Deep indigo (#4F3A93) to evoke a sense of intellect and collaboration.
- Background color: Light grey (#F5F5F7), very lightly tinted with indigo (to unify it with the primary, but ensure it's light enough for a light color scheme).
- Accent color: Violet (#9D4EDD) for interactive elements and highlights.
- Body font: 'Inter', a grotesque-style sans-serif known for its modern, neutral look, suitable for both headlines and body text.
- Clean, minimalist icons from a consistent set (e.g., Phosphor Icons) for wayfinding and user actions.
- Responsive layout using a max-w-7xl container with centered content. Use flexbox or grid with justify-center/items-center for balanced hero sections.
- Subtle transitions and feedback animations for UI interactions to improve UX (e.g., button hover effects, loading spinners).