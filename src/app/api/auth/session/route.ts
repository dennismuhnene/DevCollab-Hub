
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * This route is called by the client-side Firebase provider whenever the auth state changes.
 * It takes the user's ID token, validates it, and creates a secure, HTTP-only session cookie.
 * This cookie is then used by all server-side API routes and middleware to identify the user.
 */
export async function POST(req: NextRequest) {
  const admin = initializeFirebaseAdmin();
  try {
    const body = await req.json();
    const idToken = body.idToken;

    if (!idToken) {
      return new NextResponse(JSON.stringify({ error: 'ID token is required' }), { status: 400 });
    }

    // Session expires in 14 days.
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    // Create the response object first.
    const response = new NextResponse(JSON.stringify({ status: 'success' }), { status: 200 });

    // Set the cookie on the response.
    response.cookies.set({
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error creating session cookie:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

/**
 * This route is called when the user logs out. It clears the session cookie.
 */
export async function DELETE() {
  try {
    // Create the response object.
    const response = new NextResponse(JSON.stringify({ status: 'success' }), { status: 200 });
    
    // Set an expired cookie on the response to clear it.
    response.cookies.set({
      name: 'session',
      value: '',
      maxAge: -1, // Expire the cookie immediately
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error deleting session cookie:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
