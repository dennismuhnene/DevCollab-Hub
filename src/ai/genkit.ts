// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Read the GEMINI_API_KEY environment variable
const geminiApiKey = process.env.GEMINI_API_KEY;

// Confirm the key is loaded
if (!geminiApiKey) {
  console.error('CRITICAL: GEMINI_API_KEY environment variable not found during Genkit initialization!');
} else {
  console.log('Genkit Initializing: GEMINI_API_KEY found and being used.');
}

// Initialize Genkit with the Google AI plugin
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: geminiApiKey }), // pass the key explicitly
  ],
  model: 'googleai/gemini-2.5-flash',
  // logLevel is removed because it is not part of GenkitOptions
});

// Optional: wrapper for debug logging when calling AI
export async function debugCall(prompt: string) {
  console.log('AI request prompt:', prompt);
  const response = await ai.generate(prompt);
  console.log('AI response:', response.text);
  return response;
}
