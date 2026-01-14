'use client';
import type { Timestamp, FieldValue } from 'firebase/firestore';

// This is the new, correct type for the public-facing advisor profiles.
// It is stored in the `publicAdvisorProfiles` collection.
export interface PublicAdvisorProfile {
    uid: string;
    name: string;
    photoURL?: string;
    headline: string;
    bio: string;
    specialties: string[] | string;
    credentials?: string[] | string;
    country?: string;
    standardDeliverables?: string[];
    activeAdvisorApplicationId?: string; //  This links the public profile to the source application
}

export interface AdvisorProfile {
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'revoked';
    headline: string; 
    bio: string; 
    credentials: string[];
    specialties: string[];
    availabilityUrl?: string;
    rates?: {
        thirtyMinConsult?: number; 
        sixtyMinConsult?: number;
        proBonoMinutes?: number; 
    };
}

// New type for individual application submissions
export interface AdvisorApplication {
    id: string; // The document ID of the application
    uid: string; // The advisor's user ID
    slot: number; // The application slot number (1, 2, or 3)
    headline: string;
    bio: string;
    credentials: string[];
    specialties: string[];
    standardDeliverables?: string[]; // NEW: Advisor-defined capabilities
    verificationStatus: 'pending' | 'verified' | 'rejected';
    submissionCount: number;
    editCount: number;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
}

// The new Meeting type
export interface Meeting {
    id: string;
    eventId: string;
    startTime: string; // ISO Date String
    endTime: string;   // ISO Date String
    title: string;
    meetLink: string;
    status: 'scheduled' | 'canceled';
    rescheduleCount?: number;
}

export interface Engagement {
    id: string;
    developerId: string;
    advisorId: string;
    status: 'requested' | 'active' | 'closed' | 'rejected' | 'pending_proposal' | 'pending_developer_acceptance' | 'revision_requested';
    message: string;
    createdAt: Timestamp | FieldValue;
    activatedAt?: Timestamp | FieldValue;
    closedAt?: Timestamp | FieldValue;
    archivedBy?: string[]; // Tracks which users have archived this engagement
    developerName: string;
    developerPhotoURL: string;
    advisorName: string;
    advisorPhotoURL: string;
    advisorHeadline: string;
    videoRoomUrl?: string; // Field for Daily.co video call URL
    meetLink?: string; // Preserved for compatibility and primary link display
    meetings?: { [key: string]: Meeting }; // New map for multiple meetings
    advisorApplicationId?: string; // The ID of the specific advisor application

    // New structured fields for the proposal flow
    developerRequest?: {
        subject: string;
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
            status: 'pending' | 'in_progress' | 'submitted' | 'accepted';
            advisorSummary?: string; // Summary from the advisor when they submit
            startedAt?: Timestamp; // CORRECTLY ADDED: Timestamp for when the milestone enters 'in_progress'
            completedAt?: Timestamp; // CORRECTLY ADDED: Timestamp for when the milestone enters 'submitted'
        }[];
        notes?: string;
    };
    developerRevisionNote?: string; // Field to hold the developer's revision request message
    outcomeLog?: {
        milestoneId: string;
        milestoneDescription: string;
        advisorSummary: string;
        developerReflection?: string;
        completedAt: Timestamp;
    }[];
}

export interface EngagementMessage {
    id: string;
    senderId: string;
    text: string;
    createdAt: Timestamp | FieldValue;
    fileURL?: string;
    fileName?: string;
}

export interface AdvisorReview {
    id: string;
    engagementId: string;
    developerId: string;
    advisorId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string;
    createdAt: Timestamp | FieldValue;
    advisorResponse?: string;
    advisorResponseAt?: Timestamp | FieldValue;
    advisorApplicationId?: string; // The ID of the specific advisor application being reviewed
}
