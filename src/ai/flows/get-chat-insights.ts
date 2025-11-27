'use server';

/**
 * @fileOverview AI-powered chat insights generator.
 *
 * - getChatInsights - A function that generates discussion points for a chat between two users about a project.
 */

import { ai } from '@/ai/genkit';
import { GetChatInsightsInputSchema, GetChatInsightsOutputSchema } from '@/types/ai';
import type { GetChatInsightsInput, GetChatInsightsOutput } from '@/types/ai';


export async function getChatInsights(
  input: GetChatInsightsInput
): Promise<GetChatInsightsOutput> {
  return getChatInsightsFlow(input);
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

const getChatInsightsFlow = ai.defineFlow(
  {
    name: 'getChatInsightsFlow',
    inputSchema: GetChatInsightsInputSchema,
    outputSchema: GetChatInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
