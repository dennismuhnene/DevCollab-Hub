'use server';

/**
 * @fileOverview AI-powered project description generator.
 *
 * - generateProjectDescription - A function that generates a project description based on a title and keywords.
 * - GenerateProjectDescriptionInput - The input type for the generateProjectDescription function.
 * - GenerateProjectDescriptionOutput - The return type for the generateProjectDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {createHash} from 'crypto';
import {getRedisClient} from '@/lib/redis';

const GenerateProjectDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the project.'),
  keywords: z.array(z.string()).describe('Keywords related to the project.'),
});
export type GenerateProjectDescriptionInput = z.infer<typeof GenerateProjectDescriptionInputSchema>;

const GenerateProjectDescriptionOutputSchema = z.object({
  description: z.string().describe('A compelling project description generated from the title and keywords.'),
});
export type GenerateProjectDescriptionOutput = z.infer<typeof GenerateProjectDescriptionOutputSchema>;

export async function generateProjectDescription(input: GenerateProjectDescriptionInput): Promise<GenerateProjectDescriptionOutput> {
  const redis = getRedisClient();
  const inputJson = JSON.stringify(input);
  const hash = createHash('sha256').update(inputJson).digest('hex');
  const cacheKey = `project-description:${hash}`;

  try {
    const cachedResult = await redis.get<GenerateProjectDescriptionOutput>(cacheKey);
    if (cachedResult) {
      console.log('Cache hit for project description.');
      return cachedResult;
    }
  } catch (error) {
    console.error('Redis cache lookup failed:', error);
  }

  console.log('Cache miss for project description. Generating new description.');
  const result = await generateProjectDescriptionFlow(input);

  try {
    await redis.set(cacheKey, result, { ex: 3600 }); // Expires in 1 hour
  } catch (error) {
    console.error('Redis cache set failed:', error);
  }

  return result;
}

const prompt = ai.definePrompt({
  name: 'generateProjectDescriptionPrompt',
  input: {schema: GenerateProjectDescriptionInputSchema},
  output: {schema: GenerateProjectDescriptionOutputSchema},
  prompt: `You are a creative copywriter specializing in generating project descriptions.

  Based on the project title and keywords, create a compelling and engaging project description.

  Title: {{{title}}}
  Keywords: {{#each keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  `,
});

const generateProjectDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProjectDescriptionFlow',
    inputSchema: GenerateProjectDescriptionInputSchema,
    outputSchema: GenerateProjectDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);