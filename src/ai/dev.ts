'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/project-description-generator.ts';
import '@/ai/flows/user-skills-summarizer.ts';
import '@/ai/flows/get-user-recommendations.ts';
import '@/ai/flows/get-profile-insights.ts';
