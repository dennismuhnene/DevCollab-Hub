
'use server';

/**
 * @fileOverview AI-powered profile and project insights generator.
 *
 * - getProfileInsights - A function that generates insights based on a user's profile, their projects, and the developers interested in them.
 */

import { ai } from '@/ai/genkit';
import { GetProfileInsightsInputSchema, GetProfileInsightsOutputSchema } from '@/types/ai';
import type { GetProfileInsightsInput, GetProfileInsightsOutput } from '@/types/ai';


export async function getProfileInsights(
  input: GetProfileInsightsInput
): Promise<GetProfileInsightsOutput> {
  return getProfileInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getProfileInsightsPrompt',
  input: { schema: GetProfileInsightsInputSchema },
  output: { schema: GetProfileInsightsOutputSchema },
  prompt: `You are an expert career and project advisor for software developers. Your task is to analyze a user's profile, their projects, and the profiles of other developers who have shown interest in those projects.

Based on this data, provide a concise, actionable summary for the user.

Your analysis should answer the following:
1.  **Audience Summary:** Briefly describe the common themes or trends you see in the developers who are interested in the user's projects (e.g., "You are attracting mostly junior frontend developers with a background in React.").
2.  **Potential Gaps/Opportunities:** Based on the user's skills and projects, identify any potential gaps or exciting opportunities. Are they missing a chance to collaborate with backend developers? Is there a popular skill they could add to attract more collaborators?
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

**Profiles of Interested Developers:**
{{#if interestedDevelopers.length}}
    {{#each interestedDevelopers}}
    - Developer Bio: {{{this.bio}}}
      - Skills: {{#if this.skills}}{{#each this.skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}No skills listed.{{/if}}
      - Tech Stack: {{#if this.techStack}}{{#each this.techStack}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}No tech stack listed.{{/if}}
      - Experience: {{{this.yearsOfExperience}}} years
    {{/each}}
{{else}}
- No developers have shown interest yet.
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
    const { output } = await prompt(input);
    return output!;
  }
);
