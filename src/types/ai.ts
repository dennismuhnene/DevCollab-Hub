import { z } from 'zod';
import type { UserProfile, Project } from '@/types';

// Define Zod schemas for the nested objects first.
const UserProfileSchema = z.object({
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  yearsOfExperience: z.number().optional(),
});

const ProjectSchema = z.object({
  title: z.string(),
  description: z.string(),
  requiredSkills: z.array(z.string()),
});

// Define the main input schema for the AI flow.
export const GetProfileInsightsInputSchema = z.object({
  userProfile: UserProfileSchema.describe("The profile of the user for whom we are generating insights."),
  userProjects: z.array(ProjectSchema).describe("A list of projects created by the user."),
  interestedDevelopers: z.array(UserProfileSchema).describe("A list of profiles of developers who have shown interest in the user's projects."),
});

// Infer the TypeScript type from the Zod schema.
export type GetProfileInsightsInput = z.infer<typeof GetProfileInsightsInputSchema>;

// Define the output schema for the AI flow.
export const GetProfileInsightsOutputSchema = z.object({
    audienceSummary: z.string().describe("A summary of the common themes and trends among developers interested in the user's projects."),
    potentialGaps: z.string().describe("Identification of potential gaps or opportunities based on the user's skills and attracted audience."),
    actionableAdvice: z.string().describe("A single, clear, and actionable recommendation for the user to enhance their collaboration prospects."),
});

// Infer the TypeScript type for the output.
export type GetProfileInsightsOutput = z.infer<typeof GetProfileInsightsOutputSchema>;
