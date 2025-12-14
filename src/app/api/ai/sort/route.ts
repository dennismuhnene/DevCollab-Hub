import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/rate-limiter';
import { ai } from '@/ai/genkit';

export const runtime = 'nodejs';

// Correctly implemented AI function
async function getAiSortedIds(prompt: string): Promise<string[]> {
    console.log('--- Calling Genkit AI for sorting ---');
    try {
        const response = await ai.generate({
            prompt: prompt,
            config: { responseMimeType: "application/json" }
        });

        const rawText = response.text;

        // HARDENED JSON EXTRACTION – HANDLES CODE FENCES / EXTRA TEXT
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No JSON array found in AI response.');
        }

        const sortedIds = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(sortedIds)) {
            throw new Error('AI response is not a valid JSON array.');
        }

        return sortedIds;
    } catch (error) {
        console.error('Error calling AI model:', error);
        throw new Error('Failed to get sorting from AI model.');
    }
}

export async function POST(req: NextRequest) {
    try {
        const firebaseAdmin = initializeFirebaseAdmin();
        const authToken = req.headers.get('authorization')?.split('Bearer ')[1];
        if (!authToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(authToken);
        const userId = decodedToken.uid;
        await checkRateLimit(userId);

        const body = await req.json();
        const { context, items, viewMode } = body;

        if (!context || !items || !Array.isArray(items) || !viewMode) {
            return NextResponse.json(
                { error: 'Missing required parameters: context, items, viewMode' },
                { status: 400 }
            );
        }

        // EXACT ORIGINAL LOGIC - UNCHANGED AS REQUESTED
        const contextSummary = JSON.stringify(context, null, 2);
        const itemsSummary = JSON.stringify(
            items.map(item => ({
                id: item.id || item.uid,
                name: item.name || item.title,
                description: item.bio || item.description,
                tech: item.techStack || item.requiredTechStack,
            })),
            null,
            2
        );

        let prompt = '';
        // PROMPT IMPROVED FOR CLARITY - NOT LOGIC CHANGE
        if (viewMode === 'developers') {
            prompt = `
Given my project(s), sort these developers by who would be the best fit to collaborate with.
My Project(s) Details:
${contextSummary}

Developers to Sort:
${itemsSummary}

Return only a JSON array of the developer UIDs, ordered from most to least compatible. In the data provided, the 'id' field contains the developer's UID.
Example: ["uid1", "uid2", "uid3"]
`;
        } else {
            prompt = `
Given my professional profile, sort these projects by which would be the best fit for me to join.
My Profile Details:
${contextSummary}

Projects to Sort:
${itemsSummary}

Return only a JSON array of the project IDs, ordered from most to least compatible.
Example: ["proj_abc", "proj_xyz", "proj_123"]
`;
        }

        // Correctly calling the new function
        const sortedIds = await getAiSortedIds(prompt);

        return NextResponse.json({ sortedIds });

    } catch (error: any) {
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message?.includes('Rate limit')) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }
        console.error('AI Sort API Error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
