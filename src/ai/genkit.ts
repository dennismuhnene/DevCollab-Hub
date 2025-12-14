import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI(), // Initialize without an explicit API key
  ],
  model: 'googleai/gemini-2.5-flash',
});
