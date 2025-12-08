import { z } from 'zod';

const UserProfileSchema = z.object({
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  yearsOfExperience: z.number().optional(),
  collaborationGoals: z.array(z.string()).optional(),
  commitmentLevel: z.string().optional(),
});

const ProjectSchema = z.object({
  title: z.string(),
  description: z.string(),
  requiredSkills: z.array(z.string()),
});

export const GetProfileInsightsInputSchema = z.object({
  userProfile: UserProfileSchema.describe("The profile of the user for whom we are generating insights."),
  userProjects: z.array(ProjectSchema).describe("A list of projects created by the user."),
  interestedDevelopers: z.array(UserProfileSchema).describe("A list of profiles of developers who have shown interest in the user's projects."),
});

export type GetProfileInsightsInput = z.infer<typeof GetProfileInsightsInputSchema>;

export const GetProfileInsightsOutputSchema = z.object({
    audienceSummary: z.string().describe("A summary of the common themes and trends among developers interested in the user's projects."),
    potentialGaps: z.string().describe("Identification of potential gaps or opportunities based on the user's skills and attracted audience."),
    actionableAdvice: z.string().describe("A single, clear, and actionable recommendation for the user to enhance their collaboration prospects."),
});

export type GetProfileInsightsOutput = z.infer<typeof GetProfileInsightsOutputSchema>;

const ChatUserProfileSchema = z.object({
    skills: z.array(z.string()),
    yearsOfExperience: z.number(),
});

const ChatProjectSchema = z.object({
    title: z.string(),
    description: z.string(),
    requiredSkills: z.array(z.string()),
});

export const GetChatInsightsInputSchema = z.object({
    currentUser: ChatUserProfileSchema.describe("The profile of the user requesting the insights."),
    otherUser: ChatUserProfileSchema.describe("The profile of the other user in the chat."),
    project: ChatProjectSchema.describe("The project that they are matched on."),
});
export type GetChatInsightsInput = z.infer<typeof GetChatInsightsInputSchema>;

export const GetChatInsightsOutputSchema = z.object({
    keyOverlaps: z.string().describe("A summary of the key skill and experience overlaps between the two users relevant to the project."),
    potentialGaps: z.string().describe("A summary of potential skill or experience gaps for the project that should be discussed."),
    suggestedQuestions: z.array(z.string()).describe("A list of 3-4 insightful questions to ask the other user to clarify roles, experience, and working style."),
});
export type GetChatInsightsOutput = z.infer<typeof GetChatInsightsOutputSchema>;
