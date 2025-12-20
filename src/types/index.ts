'use client';
import type { Timestamp, FieldValue } from 'firebase/firestore';

// Defines a structure for external links
export interface ExternalLink {
  url: string;
  label: string;
}

// Defines the shape of a user's public profile
export interface UserProfile {
    uid: string;
    email?: string;
    name?: string;
    photoURL?: string;
    title?: string;
    bio?: string;
    skills?: string[];
    techStack?: string[];
    interests?: string[];
    collaborationTypes?: string[];
    collaborationGoals?: string[];
    commitmentLevel?: string;
    openForCollaboration?: boolean;
    githubUrl?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    portfolioUrl?: string;
    versionControl?: { 
      github?: string; 
    };
    socials?: { 
      linkedin?: string; 
      twitter?: string; 
    };
    extraLinks?: ExternalLink[];
    preferredRoles?: string[];
    preferredTechnologies?: string[];
    yearsOfExperience?: number; 
    timezone?: string;
    isProfileComplete?: boolean;
}

// Defines the shape of a project created by a user
export interface Project {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  projectStage: string;
  roleRequirements: string;
  requiredSkills: string[];
  requiredTechStack: string[];
  requiredYearsOfExperience?: number;
  incentives?: string;
  collaborationOpen: boolean;
  interestedUsers?: string[];
  matchedUsers?: string[];
  rejections?: { [userId: string]: number }; // Changed from rejectedUsers
  createdAt: Timestamp;
  updatedAt: Timestamp;
  imageUrl?: string;
  projectLinks?: ExternalLink[];
}

// Defines a specific role within a project that users can be matched with
export interface Role {
  id: string;
  ownerId: string;
  projectId?: string;
  title: string;
  roleDescription: string;
  requiredTechStack: string[];
  requiredSkills: string[];
  requiredYearsOfExperience?: number;
  incentives: string;
  commitmentLevel: string;
  collaborationType: string;
  partnerFunctions?: string[];
  locations: string[];
  interestedUsers?: string[]; 
  matchedUsers?: string[];
  rejections?: { [userId: string]: number }; // Changed from rejectedUsers
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Represents a confirmed match between users for a project or role
export interface Match {
  id: string;
  participants: string[]; 
  createdAt: Timestamp | FieldValue;
  
  // NEW & PREFERRED FIELDS (post-refactor)
  type?: 'project' | 'role';
  contextId?: string;
  contextTitle?: string;
  participantsDetails?: { 
      [uid: string]: Partial<UserProfile>; 
  };
  lastMessage?: string | null;
  lastMessageSender?: string | null;
  lastMessageTimestamp?: Timestamp | FieldValue;
  unreadCounts?: { 
      [uid: string]: number; 
  };
  archivedBy?: string[];
  deletedBy?: string[];

  // LEGACY FIELDS (pre-refactor)
  projectId?: string; 
  projectTitle?: string; 
  timestamp?: Timestamp; 
}

// Represents a notification within the system
export interface Notification {
  id?: string;
  type: 'interest' | 'match' | 'rejection' | 'message';
  fromUserId: string;
  fromUserName: string;
  messageSnippet?: string; 
  contextTitle?: string; 
  projectId?: string;
  projectTitle?: string;
  roleId?: string;
  roleTitle?: string;
  matchId?: string;
  read: boolean;
  rejectionCount?: number; // Added for the new rejection system
  createdAt?: Timestamp | FieldValue;
}

// Represents a single message within a match conversation
export interface Message {
  id?: string; // ID of the message document itself
  text: string;
  senderId: string;
  timestamp: Timestamp | null | FieldValue;
  deletedFor?: string[];
}
