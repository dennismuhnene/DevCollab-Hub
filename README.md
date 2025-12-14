# DevCollab Hub

<p align="center">
  <img src="/public/images/devcollab-hero.png" alt="DevCollab Hub Banner" />
</p>

<p align="center">
  <strong>Find Your Crew, Build Your Vision.</strong>
</p>

<p align="center">
  DevCollab Hub is a social and professional networking platform designed for software developers and tech enthusiasts and profesionals to connect, collaborate and create  projects together. Whether you're looking for a co-founder for your next big idea or searching for specific skills to complete your team, DevCollab Hub provides the tools to make it happen.
</p>

---

## ✨ Key Features

- **🧑‍💻 Developer Profiles:** Create a rich profile showcasing your skills, tech stack, experience and project portfolio.
- **📁 Project Listings:** Post your project ideas, detailing the required skills and technologies to attract the right talent.
- **🔍 Smart Discovery:** Browse and filter through a network of developers and projects to find the perfect match for your needs.
- **🤝 AI-Powered Matching:** Get intelligent recommendations for potential collaborators based on your profile and project requirements.
- **💬 Real-Time Chat:** Once matched, connect and communicate instantly with your new collaborators through private messaging.
- **🤖 AI-Enhanced Insights:** Leverage AI to generate compelling project descriptions, summarize profiles and get conversation starters for your new matches.
- **🔒 Secure Authentication:** Standard email/password authentication powered by Firebase.
- **⚡ Rate Limiting & Caching:** Built with Upstash Redis for robust rate limiting and caching, ensuring a smooth and reliable user experience.
- **📊 Google Analytics:** Integrated with Google Analytics for tracking user engagement and application performance.

## 🚀 Tech Stack

This project is built with a modern, scalable and powerful tech stack:

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [ShadCN UI](https://ui.shadcn.com/)
- **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication, Firestore, Cloud Storage, Cloud Functions)
- **Generative AI:** [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Rate Limiting & Caching:** [Upstash Redis](https://upstash.com/redis)
- **Analytics:** [Google Analytics](https://analytics.google.com/)
- **Deployment:** [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## 🛠️ Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (version 20 or higher recommended)
- `npm` or `yarn`

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/chombadennis/DevCollab-Hub.git
    cd DevCollab-Hub
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Firebase & Redis:**
    - Create a new project on the [Firebase Console](https://console.firebase.google.com/).
    - In your project's settings, add a new "Web App".
    - Copy the `firebaseConfig` object provided.
    - Create a new database on [Upstash](https://upstash.com/).
    - Create a `.env` file in the root of the project and populate it with your Firebase and Upstash credentials. You can use the `.env.example` file as a template. Your `.env` should look like this:

      ```env
      NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
      NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
      NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...

      upstash_redis_rest_url=...
      upstash_redis_rest_token=...
      ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9003`.

## 📜 Available Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Creates a production-ready build of the application.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase using Next.js's built-in ESLint configuration.
- `npm run genkit:dev`: Starts the Genkit development server for AI flows.

---

<p align="center">
  <a href="https://neuralaxislabs.com" target="_blank" rel="noopener noreferrer">
    <img src="/public/images/neuralaxis-logo.png" alt="NeuralAxis Labs Logo" width="64"/>
  </a>
  <br />
  This project was developed by <strong>NeuralAxis Labs</strong>.
</p>
