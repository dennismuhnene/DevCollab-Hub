import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  techStack?: string[];
  skills?: string[];
  yearsOfExperience?: number;
  createdAt: Timestamp;
  openForCollaboration?: boolean;
}

export interface Interest {
  userId: string;
  name: string;
  photoURL?: string;
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  imageUrl?: string;
  requiredTechStack: string[];
  requiredSkills: string[];
  requiredYearsOfExperience?: number;
  collaborationOpen?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  interestedUsers?: string[];
  interests?: Interest[]; // Keep for backwards compatibility or specific use cases
  matchedUsers?: string[];
}

export interface Match {
  id: string;
  projectId: string;
  projectTitle: string;
  ownerId: string;
  matchedUserId: string;
  participants: string[];
  participantsDetails: {
    uid: string;
    name: string;
    photoURL: string;
  }[];
  timestamp: Timestamp;
  status: 'active' | 'closed';
}

export interface Message {
    id?: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
}

export interface Notification {
    id?: string;
    type: 'interest' | 'match' | 'message';
    fromUserId: string;
    fromUserName: string;
    projectId?: string;
    projectTitle?: string;
    matchId?: string;
    messageSnippet?: string;
    read: boolean;
    timestamp: Timestamp | Date;
}

    