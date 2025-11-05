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
  interests?: Interest[];
}
