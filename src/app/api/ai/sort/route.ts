import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/rate-limiter';

// This is a mock implementation.
// In a real scenario, you would use a library like OpenAI's to call an AI model.
async function getAiSortedIds(prompt: string, items: any[]): Promise<string[]> {
    // Mock AI behavior by simply shuffling the item IDs.
    // Replace this with a real AI call in production.
    console.log("--- AI SORT PROMPT ---");
    console.log(prompt);
    console.log("----------------------");
    
    const ids = items.map(item => item.uid || item.id);
    // Simple shuffle for mock purposes
    for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    
    return Promise.resolve(ids);
}


export async function POST(req: NextRequest) {
    try {
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
            return NextResponse.json({ error: 'Missing required parameters: context, items, viewMode' }, { status: 400 });
        }
        
        // --- Prompt Engineering ---
        const contextSummary = JSON.stringify(context, null, 2);
        const itemsSummary = JSON.stringify(items.map(item => ({ id: item.id || item.uid, name: item.name || item.title, description: item.bio || item.description, tech: item.techStack || item.requiredTechStack })), null, 2);

        let prompt = "";
        if (viewMode === 'developers') {
            prompt = `
Given my project(s), sort these developers by who would be the best fit to collaborate with.
My Project(s) Details:\n${contextSummary}\n\nDevelopers to Sort:\n${itemsSummary}\n\nReturn only a JSON array of the developer UIDs, ordered from most to least compatible.\nExample: [\"uid1\", \"uid2\", \"uid3\"]
`;
        } else { // viewMode === 'projects'
            prompt = `
Given my professional profile, sort these projects by which would be the best fit for me to join.
My Profile Details:\n${contextSummary}\n\nProjects to Sort:\n${itemsSummary}\n\nReturn only a JSON array of the project IDs, ordered from most to least compatible.\nExample: [\"proj_abc\", \"proj_xyz\", \"proj_123\"]
`;
        }
        // --- End Prompt Engineering ---
        
        const sortedIds = await getAiSortedIds(prompt, items);

        return NextResponse.json({ sortedIds });

    } catch (error: any) {
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message.includes('Rate limit')) {
             return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }
        console.error('AI Sort API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
