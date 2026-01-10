import { Question } from '@/types';

export const questions: Question[] = [
  // 1. Onboarding & Activation
  {
    id: 'onboarding_ease',
    question: 'How easy was it to sign up and create your profile?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very difficult', 'Difficult', 'Neutral', 'Easy', 'Very easy'],
  },
  {
    id: 'onboarding_clarity',
    question: 'Did you understand what DevCollab Hub is for after onboarding?',
    type: 'multiple-choice',
    options: ['Yes, clearly', 'Somewhat', 'Not really'],
  },

  // 2. Discovery & Matching Core Loop
  {
    id: 'discovery_relevance',
    question: 'How relevant were the developers, projects, or roles shown to you?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Not relevant', 'Slightly relevant', 'Neutral', 'Relevant', 'Very relevant'],
  },
  {
    id: 'match_flow_clarity',
    question: 'How clear was the process of expressing interest and matching?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very unclear', 'Unclear', 'Neutral', 'Clear', 'Very clear'],
  },

  // 3. Dashboard & AI Insights
  {
    id: 'dashboard_usefulness',
    question: 'How useful is your dashboard for managing projects and collaborations?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Not useful', 'Slightly useful', 'Neutral', 'Useful', 'Very useful'],
  },
  {
    id: 'ai_insights_value',
    question: 'How valuable were the AI-generated insights in helping you make decisions?',
    type: 'multiple-choice',
    options: ['Very valuable', 'Somewhat valuable', 'Not valuable', 'Did not use'],
  },

  // 4. Communication & Engagement
  {
    id: 'messaging_experience',
    question: 'How smooth was the messaging experience after matching?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very poor', 'Poor', 'Neutral', 'Good', 'Excellent'],
  },

  // 5. Advisory Marketplace (conditional but important)
  {
    id: 'advisory_interest',
    question: 'How interested are you in using expert advisors on the platform?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Not interested', 'Slightly interested', 'Neutral', 'Interested', 'Very interested'],
  },

  // 6. Trust, Privacy & Confidence
  {
    id: 'trust_confidence',
    question: 'How confident do you feel using DevCollab Hub to collaborate with others?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Not confident', 'Slightly confident', 'Neutral', 'Confident', 'Very confident'],
  },

  // 7. Value & Product-Market Fit
  {
    id: 'problem_solution_fit',
    question: 'Does DevCollab Hub solve a real collaboration problem for you?',
    type: 'multiple-choice',
    options: ['Yes', 'Somewhat', 'No'],
  },
  {
    id: 'core_value_feature',
    question: 'Which feature provides the most value to you?',
    type: 'multiple-choice',
    options: [
      'Profiles',
      'Projects & Roles',
      'AI Insights',
      'Messaging',
      'Advisory',
      'Combination of features',
    ],
  },

  // 8. Retention & Recommendation
  {
    id: 'retention_intent',
    question: 'How likely are you to continue using DevCollab Hub?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very unlikely', 'Unlikely', 'Neutral', 'Likely', 'Very likely'],
  },
  {
    id: 'nps_score',
    question: 'How likely are you to recommend DevCollab Hub to a friend or colleague?',
    type: 'nps',
  },

  // 9. Open Feedback (limited but strategic)
  {
    id: 'improvement_suggestion',
    question: 'What is the ONE thing we should improve to make DevCollab Hub more valuable?',
    type: 'textarea',
  },
];
