import { Timestamp } from 'firebase/firestore';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  category?: string;
}
