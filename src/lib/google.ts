/**
This file configures the Google API client for OAuth2 and Google Calendar interactions.
*/
import { google } from 'googleapis';

/**
 * Creates and returns a new Google OAuth2 client.
 * This function accepts client credentials directly to avoid module-scope
 * issues with Next.js environment variables.
 * @param {string} clientId The Google Client ID.
 * @param {string} clientSecret The Google Client Secret.
 * @param {string} redirectUri The Google Redirect URI.
 * @returns {import('google-auth-library').OAuth2Client}
 */
export function getGoogleOAuth2Client(clientId: string, clientSecret: string, redirectUri: string) {
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}
