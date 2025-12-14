'use server';

import { createHash } from 'crypto';
import { getRedisClient } from '@/lib/redis';
import { ai } from '@/ai/genkit';
import { GetProfileInsightsInputSchema, GetProfileInsightsOutputSchema } from '@/types/ai';
import type { GetProfileInsightsInput, GetProfileInsightsOutput } from '@/types/ai';

export async function getProfileInsights(
  input: GetProfileInsightsInput
): Promise<GetProfileInsightsOutput> {
    const redis = getRedisClient();
    const cacheKey = `profile-insights:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
    try {
        const cachedResult = await redis.get<GetProfileInsightsOutput>(cacheKey);
        if (cachedResult) {
            console.log('CACHE HIT: Returning cached profile insights.');
            return cachedResult;
        }
    } catch (error) {
        console.error('Redis GET Error:', error);
    }

    console.log('CACHE MISS: Executing getProfileInsightsFlow.');
    const result = await getProfileInsightsFlow(input);

    try {
        await redis.set(cacheKey, result, { ex: 3600 }); // Cache for 1 hour
    } catch (error) {
        console.error('Redis SET Error:', error);
    }

    return result;
}

const prompt = ai.definePrompt({
  name: 'getProfileInsightsPrompt',
  input: { schema: GetProfileInsightsInputSchema },
  output: { schema: GetProfileInsightsOutputSchema },
  prompt: `You are an expert career and project advisor for software developers. Your task is to analyze a user's profile, their projects, and the profiles of other developers who have viewed, shown interest in, or matched with those projects.

Based on this data, provide a concise, actionable summary for the user.

Your analysis should answer the following:
1.  **Audience Summary:** Briefly describe the common themes or trends you see in the developers who are engaging with the user's projects (e.g., "You are attracting mostly junior frontend developers with a background in React."). Consider their skills, tech stack, and experience.
2.  **Potential Gaps/Opportunities:** Based on the user's skills and the audience they are attracting, identify any potential gaps or exciting opportunities. Are they missing a chance to collaborate with backend developers? Is there a popular skill they could add to attract more collaborators?
3.  **Actionable Advice:** Provide a single, clear recommendation for the user. For example: "Consider creating a new project that requires Node.js to attract backend developers," or "Highlight your 'System Design' skill more prominently in your bio to attract senior talent."

**User's Profile:**
- Bio: {{{userProfile.bio}}}
- Skills: {{#if userProfile.skills}}{{#each userProfile.skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}No skills listed.{{/if}}
- Tech Stack: {{#if userProfile.techStack}}{{#each userProfile.techStack}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}No tech stack listed.{{/if}}
- Experience: {{{userProfile.yearsOfExperience}}} years

**User's Projects:**
{{#each userProjects}}
- Project Title: {{{this.title}}}
  - Description: {{{this.description}}}
  - Required Skills: {{#each this.requiredSkills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

**Profiles of Interested, Matched, and Visiting Developers:**
{{#if interestedDevelopers.length}}
    {{#each interestedDevelopers}}
    - Developer Bio: {{{this.bio}}}
      - Skills: {{#if this.skills}}{{#each this.skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}No skills listed.{{/if}}
      - Tech Stack: {{#if this.techStack}}{{#each this.techStack}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}No tech stack listed.{{/if}}
      - Experience: {{{this.yearsOfExperience}}} years
    {{/each}}
{{else}}
- No developers have shown interest, matched, or viewed your projects yet.
{{/if}}

Generate the insight now.
`,
});

const getProfileInsightsFlow = ai.defineFlow(
  {
    name: 'getProfileInsightsFlow',
    inputSchema: GetProfileInsightsInputSchema,
    outputSchema: GetProfileInsightsOutputSchema,
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

        const isOverloaded =
          err?.status === 'UNAVAILABLE' ||
          err?.code === 503 ||
          err?.originalMessage?.includes('model is overloaded') ||
          err?.originalMessage?.includes('503');

        if (attempts < maxAttempts && isOverloaded) {
          const delay = 200 * attempts;
          console.warn(
            `getProfileInsightsFlow retry attempt ${attempts} after model overload (503). Waiting ${delay}ms.`
          );
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        throw err;
      }
    }
  }
);
