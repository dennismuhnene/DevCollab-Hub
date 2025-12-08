import { Timestamp } from 'firebase/firestore';

export interface ExternalLink {
  type: string;
  url: string;
}

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
  collaborationGoals?: string[];
  commitmentLevel?: string;
  versionControl?: ExternalLink;
  portfolioUrl?: string;
  socials?: ExternalLink;
  extraLinks?: ExternalLink[];
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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  interestedUsers?: string[];
  matchedUsers?: string[];
  projectStage?: string;
  roleRequirements?: string;
  incentives?: string;
  projectLinks?: ExternalLink[];
}

export interface Match {
  id: string;
  projectId: string;
  projectTitle: string;
  participants: string[];
  participantsDetails: {
    [uid: string]: {
      name: string;
      photoURL?: string;
    }
  };
  timestamp: Timestamp;
  status: 'active' | 'closed';
  lastMessage?: string | null;
  createdAt: Timestamp;
  archivedBy?: string[];
  unreadCounts?: {
    [uid: string]: number;
  };
}

export interface Message {
    id?: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
}

export interface Notification {
    id?: string;
    type: 'interest' | 'match' | 'message' | 'rejection';
    // from who
    fromUserId: string;
    fromUserName: string;
    // related to what
    projectId?: string;
    projectTitle?: string;
    matchId?: string;
    messageSnippet?: string;
    // state
    read: boolean;
    timestamp: Timestamp | object; // object for serverTimestamp
}
