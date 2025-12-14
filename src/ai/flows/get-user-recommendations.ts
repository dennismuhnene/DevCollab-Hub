'use server';

import { createHash } from 'crypto';
import { getRedisClient } from '@/lib/redis';
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
    const redis = getRedisClient();
    const cacheKey = `user-recs:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
    try {
        const cachedResult = await redis.get<GetUserRecommendationsOutput>(cacheKey);
        if (cachedResult) {
            console.log('CACHE HIT: Returning cached user recommendations.');
            return cachedResult;
        }
    } catch (error) {
        console.error('Redis GET Error:', error);
    }

    console.log('CACHE MISS: Executing getUserRecommendationsFlow.');
    const result = await getUserRecommendationsFlow(input);

    try {
        await redis.set(cacheKey, result, { ex: 3600 }); // Cache for 1 hour
    } catch (error) {
        console.error('Redis SET Error:', error);
    }

    return result;
}

const prompt = ai.definePrompt({
  name: 'getUserRecommendationsPrompt',
  input: {schema: GetUserRecommendationsInputSchema},
  output: {schema: GetUserRecommendationsOutputSchema},
  prompt: `You are an AI assistant designed to provide project recommendations to users based on their skills.

Given the user's skills and a list of project descriptions, identify the projects that best match the user's skillset and interests.  Return a list of project descriptions that the user would be interested in.

Your recommendations should be prioritized based on the following hierarchy, in order:
1. Tech Stack
2. Skills
3. Years of Experience

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
    let attempts = 0;
    const maxAttempts = 3;

    while (true) {
      try {
        const {output} = await prompt(input);
        return output!;
      } catch (err: any) {
        attempts++;

        const isOverloaded =
          err?.status === 'UNAVAILABLE' ||
          err?.code === 503 ||
          err?.originalMessage?.includes('model is overloaded') ||
          err?.originalMessage?.includes('503');

        if (attempts < maxAttempts && isOverloaded) {
          const delay = 200 * attempts;
          console.warn(
            `getUserRecommendationsFlow retry attempt ${attempts} after model overload (503). Waiting ${delay}ms.`
          );
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        throw err;
      }
    }
  }
);
