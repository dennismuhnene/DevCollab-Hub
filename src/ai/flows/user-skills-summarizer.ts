'use server';

/**
 * @fileOverview Summarizes user profile and skills into a concise 'about me' section.
 *
 * - summarizeUserSkills - A function that summarizes user skills and profile information.
 * - SummarizeUserSkillsInput - The input type for the summarizeUserSkills function.
 * - SummarizeUserSkillsOutput - The return type for the summarizeUserSkills function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {createHash} from 'crypto';
import {getRedisClient} from '@/lib/redis';

const SummarizeUserSkillsInputSchema = z.object({
  profileDescription: z
    .string()
    .describe('A detailed description of the user profile.'),
  skills: z
    .array(z.string())
    .describe('A list of skills possessed by the user.'),
});
export type SummarizeUserSkillsInput = z.infer<typeof SummarizeUserSkillsInputSchema>;

const SummarizeUserSkillsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the user skills and profile.'),
});
export type SummarizeUserSkillsOutput = z.infer<typeof SummarizeUserSkillsOutputSchema>;

export async function summarizeUserSkills(
  input: SummarizeUserSkillsInput
): Promise<SummarizeUserSkillsOutput> {
  const redis = getRedisClient();
  const inputJson = JSON.stringify(input);
  const hash = createHash('sha256').update(inputJson).digest('hex');
  const cacheKey = `user-skills-summary:${hash}`;

  try {
    const cachedResult = await redis.get<SummarizeUserSkillsOutput>(cacheKey);
    if (cachedResult) {
      console.log('Cache hit for user skills summary.');
      return cachedResult;
    }
  } catch (error) {
    console.error('Redis cache lookup failed:', error);
  }

  console.log('Cache miss for user skills summary. Generating new summary.');
  const result = await summarizeUserSkillsFlow(input);

  try {
    await redis.set(cacheKey, JSON.stringify(result), { ex: 3600 }); // Expires in 1 hour
  } catch (error) {
    console.error('Redis cache set failed:', error);
  }

  return result;
}

const prompt = ai.definePrompt({
  name: 'summarizeUserSkillsPrompt',
  input: {schema: SummarizeUserSkillsInputSchema},
  output: {schema: SummarizeUserSkillsOutputSchema},
  prompt: `You are an expert at summarizing user profiles and skills into a concise and engaging "about me" section.  Use the following information about the user to generate a compelling summary.

Profile Description: {{{profileDescription}}}
Skills: {{#each skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}`,
});

const summarizeUserSkillsFlow = ai.defineFlow(
  {
    name: 'summarizeUserSkillsFlow',
    inputSchema: SummarizeUserSkillsInputSchema,
    outputSchema: SummarizeUserSkillsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);