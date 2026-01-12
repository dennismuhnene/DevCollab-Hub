require('dotenv').config();
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import cors from 'cors';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const corsHandler = cors({ origin: true });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

/**
 * Generates a Google OAuth2 URL for the user to grant calendar permissions.
 */
export const getGoogleAuthUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required to generate Google Auth URL.');
  }
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.error("Missing Google OAuth2 configuration. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables.");
    throw new functions.https.HttpsError('internal', 'The server is not configured for Google Calendar integration.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const scopes = ['https://www.googleapis.com/auth/calendar.events.owned'];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // This forces the refresh token to be sent every time.
    scope: scopes,
    state: context.auth.uid, // Pass the Firebase UID in the state parameter
  });

  return { url };
});

/**
 * Handles the redirect from Google OAuth2, exchanges the code for tokens, and saves them.
 */
export const handleGoogleRedirect = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    const { code, state } = request.query;
    const uid = state as string; // The Firebase UID we passed in the state parameter

    if (typeof code !== 'string') {
      response.status(400).send('Invalid authorization code.');
      return;
    }

    if (!uid) {
        response.status(400).send('No state parameter found, cannot identify user.');
        return;
    }

    if (!clientId || !clientSecret || !redirectUri) {
        console.error("Missing Google OAuth2 configuration.");
        response.status(500).send('Server configuration error.');
        return;
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
          // This can happen if the user has previously granted consent and hasn't revoked it.
          // In this case, we only get an access token. We need to ensure our logic can handle this.
          // For this app, we will assume a refresh token is always required. If not present, we will ask the user to re-authenticate.
          console.warn(`No refresh token received for user ${uid}. The user may need to re-authenticate if they have revoked permissions.`);
      }

      // Save the tokens to the user's document in Firestore
      const userRef = db.collection('users').doc(uid);
      await userRef.update({
        googleTokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
            scope: tokens.scope,
        }
      });

      // Send a simple HTML response to close the popup window
      response.send("<script>window.close();</script>");

    } catch (error) {
      console.error('Error exchanging authorization code for tokens:', error);
      response.status(500).send('Failed to authenticate with Google.');
    }
  });
});
