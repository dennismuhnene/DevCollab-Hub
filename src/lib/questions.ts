import { Question } from '@/types';

export const questions: Question[] = [
    // --- Phase 1: Onboarding & Initial Impression (Beginner) ---
    {
        id: 'user_stage',
        question: 'How long have you been using DevCollab Hub?',
        type: 'multiple-choice',
        options: ['Just signed up', 'A few days', 'A few weeks', 'More than a month'],
    },
    {
        id: 'first_impression_clarity',
        question: 'On a scale of 1 to 5, how easy was it to understand what DevCollab Hub is for when you first signed up?',
        type: 'slider',
        min: 1,
        max: 5,
        labels: ['Very Confusing', '', 'Neutral', '', 'Very Clear'],
    },
    {
        id: 'profile_setup_ease',
        question: 'How easy was it to set up your initial profile?',
        type: 'slider',
        min: 1,
        max: 5,
        labels: ['Very Difficult', '', 'Neutral', '', 'Very Easy'],
    },
    {
        id: 'initial_actions',
        question: 'What were the first things you tried to do on the platform? (Select all that apply)',
        type: 'checkbox',
        options: ['Searched for developers', 'Searched for projects', 'Created a project', 'Applied to be an advisor', 'Looked at my dashboard', 'Just browsed around'],
    },

    // --- Phase 2: Core Feature Usage (Intermediate) ---
    {
        id: 'most_used_features',
        question: 'Which of the following features have you used the most?',
        type: 'multiple-choice',
        options: ['Developer/Project Discovery', 'Dashboard & Insights', 'Direct Messaging', 'Advisory Engagements', "I haven't used these features much yet"],
    },
    {
        id: 'discovery_effectiveness',
        question: 'How effective is the search and filtering for finding relevant people or projects?',
        type: 'slider',
        min: 1,
        max: 5,
        labels: ['Not at all effective', '', 'Somewhat effective', '', 'Very effective'],
    },
    {
        id: 'dashboard_usefulness',
        question: 'How useful do you find your personal dashboard for managing your activities?',
        type: 'slider',
        min: 1,
        max: 5,
        labels: ['Not useful', '', 'Somewhat useful', '', 'Very useful'],
    },
    {
        id: 'connection_flow_clarity',
        question: 'How clear was the process of "matching" with another user and starting a conversation?',
        type: 'slider',
        min: 1,
        max: 5,
        labels: ['Very Confusing', '', 'Neutral', '', 'Very Clear'],
    },
    {
        id: 'feature_wishlist',
        question: 'Is there a specific feature you wish DevCollab Hub had that it currently doesn\'t?',
        type: 'textarea',
    },

    // --- Phase 3: Advanced Features & Overall Value (Advanced) ---
    {
        id: 'engagement_system_clarity',
        question: 'If you\'ve used the Advisory Engagement system, how would you rate its clarity and structure?',
        type: 'multiple-choice',
        options: ["I haven't used it", 'Confusing to navigate', 'Okay, but could be better', 'Clear and well-structured', 'Excellent, very intuitive'],
    },
    {
        id: 'value_proposition_met',
        question: 'Does DevCollab Hub deliver on its promise of helping you "find your crew" or get expert advice?',
        type: 'multiple-choice',
        options: ['Not at all', 'Partially', 'Mostly, yes', 'Absolutely'],
    },
    {
        id: 'most_valuable_aspect',
        question: 'What is the single most valuable aspect of DevCollab Hub for you?',
        type: 'text',
    },
    {
        id: 'biggest_frustration',
        question: 'What has been your biggest frustration or pain point while using the platform?',
        type: 'textarea',
    },

    // --- Phase 4: Overall & Future-Facing ---
    {
        id: 'nps_score',
        question: 'On a scale from 0 to 10, how likely are you to recommend DevCollab Hub to a friend or colleague?',
        type: 'nps',
    },
    {
        id: 'platform_speed',
        question: 'How would you rate the overall speed and performance of the platform?',
        type: 'slider',
        min: 1,
        max: 5,
        labels: ['Very Slow', '', 'Average', '', 'Very Fast'],
    },
    {
        id: 'design_appeal',
        question: 'How visually appealing do you find the platform\'s design and layout?',
        type: 'slider',
        min: 1,
        max: 5,
        labels: ['Unappealing', '', 'Neutral', '', 'Very Appealing'],
    },
    {
        id: 'trust_level',
        question: 'How much do you trust the profiles and projects you see on the platform?',
        type: 'slider',
        min: 1,
        max: 5,
        labels: ['Do not trust', '', 'Neutral', '', 'Fully trust'],
    },
    {
        id: 'contact_permission',
        question: 'Would you be open to us contacting you to follow up on your feedback?',
        type: 'multiple-choice',
        options: ["Yes, that's fine", "No, I'd prefer not to be contacted"],
    },
    {
        id: 'final_thoughts',
        question: 'Any final thoughts or suggestions for how we can improve?',
        type: 'textarea',
    },
];
