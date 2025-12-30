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
    slot: number; // The application slot number (1, 2, or 3)
    headline: string;
    bio: string;
    credentials: string[];
    specialties: string[];
    verificationStatus: 'pending' | 'verified' | 'rejected';
    submissionCount: number;
    editCount: number;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
}

export interface Engagement {
    id: string;
    developerId: string;
    advisorId: string;
    status: 'requested' | 'active' | 'closed' | 'archived' | 'rejected';
    message: string;
    createdAt: Timestamp | FieldValue;
    activatedAt?: Timestamp | FieldValue;
    closedAt?: Timestamp | FieldValue;
    developerName: string;
    developerPhotoURL: string;
    advisorName: string;
    advisorPhotoURL: string;
    advisorHeadline: string;
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
}
