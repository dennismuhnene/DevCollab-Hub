'use server';

import { createHash } from 'crypto';
import { redis } from '@/lib/redis';
import { ai } from '@/ai/genkit';
import { GetChatInsightsInputSchema, GetChatInsightsOutputSchema } from '@/types/ai';
import type { GetChatInsightsInput, GetChatInsightsOutput } from '@/types/ai';

export async function getChatInsights(
  input: GetChatInsightsInput
): Promise<GetChatInsightsOutput> {
    const cacheKey = `chat-insights:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
    try {
        const cachedResult = await redis.get<GetChatInsightsOutput>(cacheKey);
        if (cachedResult) {
            console.log('CACHE HIT: Returning cached chat insights.');
            return cachedResult;
        }
    } catch (error) {
        console.error('Redis GET Error:', error);
    }

    console.log('CACHE MISS: Executing getChatInsightsFlow.');
    const result = await getChatInsightsFlow(input);

    try {
        await redis.set(cacheKey, result, { ex: 3600 }); // Cache for 1 hour
    } catch (error) {
        console.error('Redis SET Error:', error);
    }

    return result;
}

const prompt = ai.definePrompt({
  name: 'getChatInsightsPrompt',
  input: { schema: GetChatInsightsInputSchema },
  output: { schema: GetChatInsightsOutputSchema },
  prompt: `You are an expert career and project advisor for software developers. Your task is to analyze the profiles of two developers who have matched for a specific project and provide strategic advice for their conversation.

Based on this data, provide:
1.  **Key Overlaps & Strengths:** Identify the strongest synergistic points between the two users based on their skills and the project requirements. What makes them a potentially great team for this?
2.  **Potential Gaps to Discuss:** What are the potential skill or experience gaps for this project that they should discuss? Where might they need to learn or find a third collaborator?
3.  **Suggested Questions to Ask:** Generate a list of 3-4 insightful questions that the current user should ask the other user. These questions should help clarify roles, experience, and working styles. Focus on questions that go beyond a simple "yes/no" answer.

**The Project They Matched On:**
- Title: {{{project.title}}}
- Description: {{{project.description}}}
- Required Skills: {{#each project.requiredSkills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

**Current User's Profile:**
- Skills: {{#if currentUser.skills}}{{#each currentUser.skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}No skills listed.{{/if}}
- Experience: {{{currentUser.yearsOfExperience}}} years

**Other User's Profile:**
- Skills: {{#if otherUser.skills}}{{#each otherUser.skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}No skills listed.{{/if}}
- Experience: {{{otherUser.yearsOfExperience}}} years

Generate the insights now.
`,
});

// Wrapped with retry logic
const getChatInsightsFlow = ai.defineFlow(
  {
    name: 'getChatInsightsFlow',
    inputSchema: GetChatInsightsInputSchema,
    outputSchema: GetChatInsightsOutputSchema,
  },
  async (input) => {
    let attempts = 0;
    const maxAttempts = 3;

    while (true) {
      try {
        const { output } = await prompt(input);
        return output!;
      } catch (err: any) {
        attempts++;

        // Only retry for 503 "model overloaded"
        const isOverloaded =
          err?.status === 'UNAVAILABLE' ||
          err?.code === 503 ||
          err?.originalMessage?.includes('model is overloaded') ||
          err?.originalMessage?.includes('503');

        if (attempts < maxAttempts && isOverloaded) {
          const delay = 200 * attempts; // backoff
          console.warn(
            `getChatInsightsFlow retry attempt ${attempts} after model overload (503). Waiting ${delay}ms.`
          );
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        throw err; // rethrow all other errors
      }
    }
  }
);
