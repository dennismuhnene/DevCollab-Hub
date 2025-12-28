
// setAdmin.js
require('dotenv').config(); // This loads the .env file
const admin = require('firebase-admin');

const userEmail = process.argv[2];

// 1. Validate user email input
if (!userEmail) {
  console.error('Error: Please provide your user email as an argument.');
  console.log('Usage: node setAdmin.js <your-email@example.com>');
  process.exit(1);
}

// 2. Load and parse the service account key from the environment variable
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
    console.error('Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in your .env file.');
    console.error('Please ensure your .env file contains the service account key.');
    process.exit(1);
}

let serviceAccount;
try {
    serviceAccount = JSON.parse(serviceAccountKey);
} catch (error) {
    console.error('Error: Failed to parse the FIREBASE_SERVICE_ACCOUNT_KEY from your .env file.');
    console.error('Please ensure it is a valid JSON string.');
    process.exit(1);
}

// 3. Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 4. Main function to set the admin claim
async function setAdminClaim() {
  try {
    console.log(`Fetching user: ${userEmail}...`);
    const user = await admin.auth().getUserByEmail(userEmail);
    
    if (user.customClaims && user.customClaims.admin === true) {
      console.log(`Success! ${userEmail} is already an admin.`);
      process.exit(0);
    }
    
    console.log(`Setting 'admin: true' claim for user: ${user.uid}...`);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log(`\n✅ Success! Custom claim 'admin: true' has been set for ${userEmail}.`);
    console.log('🔴 IMPORTANT: You must log out and log back in to the web application for the changes to take effect.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error setting custom claim:', error.message);
    if (error.code === 'auth/user-not-found') {
        console.error(`Could not find a Firebase user with the email: ${userEmail}`);
    }
    process.exit(1);
  }
}

setAdminClaim();
