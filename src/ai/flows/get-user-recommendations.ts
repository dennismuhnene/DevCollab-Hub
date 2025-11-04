'use server';

/**
 * @fileOverview AI-powered project recommendation system.
 *
 * - getUserRecommendations - A function that retrieves project recommendations for a user based on their skills and interests.
 * - GetUserRecommendationsInput - The input type for the getUserRecommendations function.
 * - GetUserRecommendationsOutput - The return type for the getUserRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetUserRecommendationsInputSchema = z.object({
  userSkills: z.array(z.string()).describe('The skills of the user.'),
  projectDescriptions: z.array(z.string()).describe('The descriptions of the projects.'),
});
export type GetUserRecommendationsInput = z.infer<typeof GetUserRecommendationsInputSchema>;

const GetUserRecommendationsOutputSchema = z.array(z.string()).describe('A list of project recommendations based on the user skills.');
export type GetUserRecommendationsOutput = z.infer<typeof GetUserRecommendationsOutputSchema>;

export async function getUserRecommendations(
  input: GetUserRecommendationsInput
): Promise<GetUserRecommendationsOutput> {
  return getUserRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getUserRecommendationsPrompt',
  input: {schema: GetUserRecommendationsInputSchema},
  output: {schema: GetUserRecommendationsOutputSchema},
  prompt: `You are an AI assistant designed to provide project recommendations to users based on their skills.

Given the user's skills and a list of project descriptions, identify the projects that best match the user's skillset and interests.  Return a list of project descriptions that the user would be interested in.

User Skills:
{{#each userSkills}}
- {{this}}
{{/each}}

Project Descriptions:
{{#each projectDescriptions}}
- {{this}}
{{/each}}`,
});

const getUserRecommendationsFlow = ai.defineFlow(
  {
    name: 'getUserRecommendationsFlow',
    inputSchema: GetUserRecommendationsInputSchema,
    outputSchema: GetUserRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
