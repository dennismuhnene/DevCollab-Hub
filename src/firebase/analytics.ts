'use client';

import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import { analyticsInstance } from '@/firebase/analytics-instance';

// Generic Event Logger
const logAnalyticsEvent = (eventName: string, params?: { [key: string]: any }) => {
  // Now using the singleton instance
  if (analyticsInstance) {
    firebaseLogEvent(analyticsInstance, eventName, params);
  }
};

// --- Specific Event Logging Functions (no changes needed below) ---

export const logLogin = (userId: string) => {
  logAnalyticsEvent('login', { method: 'email', user_id: userId });
};

export const logSignUp = (userId: string) => {
  logAnalyticsEvent('sign_up', { method: 'email', user_id: userId });
};

export const logProfileUpdate = (userId: string) => {
  logAnalyticsEvent('profile_updated', { user_id: userId });
};

export const logProjectCreated = (projectId: string, userId: string) => {
  logAnalyticsEvent('project_created', { project_id: projectId, user_id: userId });
};

export const logProjectDeleted = (projectId: string, userId: string) => {
  logAnalyticsEvent('project_deleted', { project_id: projectId, user_id: userId });
};

export const logMatchCreated = (matchId: string, participants: string[]) => {
  logAnalyticsEvent('match_created', { match_id: matchId, participants });
};

export const logMessageSent = (matchId: string, userId: string) => {
  logAnalyticsEvent('message_sent', { match_id: matchId, user_id: userId });
};

export const logAiDescriptionGenerated = (projectId: string, userId: string) => {
  logAnalyticsEvent('ai_description_generated', { project_id: projectId, user_id: userId });
};

export const logFilterUsed = (filterType: string, filterValue: string) => {
  logAnalyticsEvent('filter_used', { filter_type: filterType, filter_value: filterValue });
};

export const logFeedbackSubmitted = (userId: string) => {
  logAnalyticsEvent('feedback_submitted', { user_id: userId });
};

export const logProfileView = (profileId: string, viewerId: string) => {
    logAnalyticsEvent('profile_view', { profile_id: profileId, viewer_id: viewerId });
};

export const logAiSort = (userId: string, sortedCriteria: string) => {
    logAnalyticsEvent('ai_sort', { user_id: userId, sorted_criteria: sortedCriteria });
};

export const logAiChatInsightGenerated = (matchId: string, userId: string) => {
    logAnalyticsEvent('ai_chat_insight_generated', { match_id: matchId, user_id: userId });
};

export const logProjectView = (projectId: string, viewerId: string) => {
    logAnalyticsEvent('project_view', { project_id: projectId, viewer_id: viewerId });
};

export const logInterestShown = (projectId: string, userId: string) => {
    logAnalyticsEvent('interest_shown', { project_id: projectId, user_id: userId });
};
