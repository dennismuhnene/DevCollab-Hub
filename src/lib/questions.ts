import { Question } from '@/types';

export const questions: Question[] = [
  // 1. Onboarding & First-Time Experience
  {
    id: 'onboarding_ease',
    question: 'How easy was it to sign up and create your profile?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very difficult', 'Difficult', 'Neutral', 'Easy', 'Very easy'],
  },
  {
    id: 'onboarding_purpose_understanding',
    question: 'Did you understand the purpose of DevCollab Hub during the onboarding flow?',
    type: 'multiple-choice',
    options: ['Yes', 'Somewhat', 'No'],
  },
  {
    id: 'onboarding_unclear_part',
    question: 'Which part of onboarding felt unclear or confusing?',
    type: 'textarea',
  },
  {
    id: 'onboarding_duration_feeling',
    question: 'How long did the onboarding process feel?',
    type: 'multiple-choice',
    options: ['Too short', 'Appropriate', 'Too long'],
  },
  // 2. Developer Profile & Profile Editing
  {
    id: 'profile_editing_ease',
    question: 'How easy was it to create or edit your profile?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very difficult', 'Difficult', 'Neutral', 'Easy', 'Very easy'],
  },
  {
    id: 'profile_unnecessary_fields',
    question: 'Which profile fields felt unnecessary or confusing?',
    type: 'textarea',
  },
  {
    id: 'profile_skill_selection_accuracy',
    question: 'Did the skill/tag selection process feel accurate and comprehensive?',
    type: 'multiple-choice',
    options: ['Yes', 'Mostly', 'Needs improvement', 'No'],
  },
  // 3. Project Listings & Discovery
  {
    id: 'project_creation_ease',
    question: 'How easy was it to create a project listing?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very difficult', 'Difficult', 'Neutral', 'Easy', 'Very easy'],
  },
  {
    id: 'project_relevance',
    question: 'How relevant were the projects shown to you?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Not relevant at all', 'Slightly relevant', 'Neutral', 'Relevant', 'Very relevant'],
  },
  {
    id: 'project_form_intuitive',
    question: 'Did the project creation form feel complete and intuitive?',
    type: 'multiple-choice',
    options: ['Yes', 'Somewhat', 'No'],
  },
  {
    id: 'project_additional_fields',
    question: 'What additional fields would you add to the project listing form?',
    type: 'textarea',
  },
  // 4. Smart Discovery & Search Filters
  {
    id: 'search_filters_usefulness',
    question: 'How useful were the search filters in helping you find relevant developers/projects?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Not useful at all', 'Slightly useful', 'Neutral', 'Useful', 'Very useful'],
  },
  {
    id: 'search_filters_most_used',
    question: 'Which filters did you use most often?',
    type: 'checkbox',
    options: ['Tech stack', 'Skills', 'Experience level', 'Project type', 'Collaboration type', 'Other'],
  },
  {
    id: 'search_filters_missing',
    question: 'Were there any filters missing that you expected?',
    type: 'textarea',
  },
  // 5. AI-Powered Matching
  {
    id: 'ai_recommendation_relevance',
    question: 'How relevant were the collaborator recommendations you received?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Not relevant at all', 'Slightly relevant', 'Neutral', 'Relevant', 'Very relevant'],
  },
  {
    id: 'ai_insights_helpfulness',
    question: 'Did the AI-generated project descriptions or insights feel helpful?',
    type: 'multiple-choice',
    options: ['Very helpful', 'Somewhat helpful', 'Not helpful'],
  },
  {
    id: 'ai_summary_accuracy',
    question: 'How would you rate the accuracy of AI-generated profile summaries?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very inaccurate', 'Inaccurate', 'Neutral', 'Accurate', 'Very accurate'],
  },
  {
    id: 'ai_improvements_suggestion',
    question: 'What improvements would you suggest for AI features?',
    type: 'textarea',
  },
  // 6. Real-Time Chat & Messaging
  {
    id: 'chat_responsiveness',
    question: 'Was real-time chat responsive and stable?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very unstable', 'Unstable', 'Neutral', 'Stable', 'Very stable'],
  },
  {
    id: 'chat_start_conversation_ease',
    question: 'How easy was it to start a conversation with a match?',
    type: 'multiple-choice',
    options: ['Very easy', 'Easy', 'Hard', 'Very hard'],
  },
  {
    id: 'chat_message_failures',
    question: 'Did you encounter any delays or message failures?',
    type: 'multiple-choice',
    options: ['Yes', 'No'],
  },
  {
    id: 'chat_message_failures_details',
    question: 'If you encountered delays or failures, please describe them.',
    type: 'textarea',
  },
  // 7. User Interface & User Experience
  {
    id: 'ui_visual_appeal',
    question: 'How visually appealing is the DevCollab Hub interface?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very unappealing', 'Unappealing', 'Neutral', 'Appealing', 'Very appealing'],
  },
  {
    id: 'ui_navigation_ease',
    question: 'How easy is it to navigate between sections of the app?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very difficult', 'Difficult', 'Neutral', 'Easy', 'Very easy'],
  },
  {
    id: 'ui_confusing_parts',
    question: 'What parts of the UI felt confusing or cluttered?',
    type: 'textarea',
  },
  // 8. Performance & Reliability
  {
    id: 'performance_loading_speed',
    question: "How would you rate the app's loading speed?",
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very slow', 'Slow', 'Neutral', 'Fast', 'Very fast'],
  },
  {
    id: 'performance_crashes_bugs',
    question: 'Did you experience any crashes, freezes, or bugs?',
    type: 'multiple-choice',
    options: ['Yes', 'No'],
  },
  {
    id: 'performance_crashes_bugs_details',
    question: 'If you experienced issues, please describe them.',
    type: 'textarea',
  },
  {
    id: 'performance_overall_smoothness',
    question: 'How smooth was your overall experience using DevCollab Hub?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very choppy', 'Choppy', 'Neutral', 'Smooth', 'Very smooth'],
  },
  // 9. Value Proposition & Engagement
  {
    id: 'value_likelihood_to_use',
    question: 'How likely are you to use DevCollab Hub to find collaborators?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very unlikely', 'Unlikely', 'Neutral', 'Likely', 'Very likely'],
  },
  {
    id: 'value_solves_real_problem',
    question: 'Does DevCollab Hub solve a real problem for you?',
    type: 'multiple-choice',
    options: ['Yes', 'Somewhat', 'No'],
  },
  {
    id: 'value_most_valuable_feature',
    question: 'Which feature provides the most value to you?',
    type: 'multiple-choice',
    options: ['Profiles', 'Projects', 'AI Matching', 'Messaging', 'All', 'None', 'Other'],
  },
  {
    id: 'value_next_feature_priority',
    question: 'What feature would you want us to prioritize next?',
    type: 'textarea',
  },
  // 10. Privacy, Security & Trust
  {
    id: 'privacy_data_security_feeling',
    question: 'Did you feel your data was secure while using the platform?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very insecure', 'Insecure', 'Neutral', 'Secure', 'Very secure'],
  },
  {
    id: 'privacy_comfortable_with_profile',
    question: 'Were you comfortable completing your full profile?',
    type: 'multiple-choice',
    options: ['Yes', 'Somewhat', 'No'],
  },
  {
    id: 'privacy_concerns',
    question: 'Any concerns about privacy or security?',
    type: 'textarea',
  },
  // 11. Overall Satisfaction
  {
    id: 'satisfaction_overall',
    question: 'Overall, how satisfied are you with DevCollab Hub?',
    type: 'slider',
    min: 1,
    max: 5,
    labels: ['Very unsatisfied', 'Unsatisfied', 'Neutral', 'Satisfied', 'Very satisfied'],
  },
  {
    id: 'satisfaction_nps',
    question: 'Would you recommend the platform to a friend or colleague?',
    type: 'nps',
  },
  {
    id: 'satisfaction_additional_comments',
    question: 'Any additional comments, suggestions, or ideas?',
    type: 'textarea',
  },
];
