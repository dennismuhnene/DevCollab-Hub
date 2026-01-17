
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Helper to extract the storage path from a Firebase Storage URL
function getPathFromStorageUrl(url: string): string | null {
  if (!url || !url.startsWith("https://firebasestorage.googleapis.com")) {
    return null;
  }
  try {
    const pathWithQuery = url.split("/o/")[1];
    const encodedPath = pathWithQuery.split("?")[0];
    const decodedPath = decodeURIComponent(encodedPath);
    return decodedPath;
  } catch (error) {
    functions.logger.error("Error extracting path from Firebase Storage URL:", error);
    return null;
  }
}

export const deleteBlogImage = functions.https.onCall(async (data, context) => {
  // Check for authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { imageUrl } = data;
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with an 'imageUrl' argument."
    );
  }

  const filePath = getPathFromStorageUrl(imageUrl);
  if (!filePath) {
    functions.logger.error("Could not parse file path from URL:", imageUrl);
    throw new functions.https.HttpsError("invalid-argument", "Invalid Firebase Storage URL provided.");
  }
  
  // Optional: Check if the user has permission to delete this file.
  // This is a good security practice.
  if (!filePath.startsWith(`blog-images/${context.auth.uid}`)) {
      throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete this file.");
  }

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    await file.delete();
    functions.logger.info(`User ${context.auth.uid} deleted file: ${filePath}`);
    return { success: true, message: "File deleted successfully." };
  } catch (error: any) {
    // If the file doesn't exist, it's not an error in this context.
    if (error.code === 404) {
         functions.logger.info(`File not found, no need to delete: ${filePath}`);
         return { success: true, message: "File did not exist." };
    }
    functions.logger.error(`Failed to delete file ${filePath} for user ${context.auth.uid}`, error);
    throw new functions.https.HttpsError("internal", "Failed to delete file.");
  }
});

export const deleteProjectImage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { imageUrl } = data;
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with an 'imageUrl' argument.");
  }

  const filePath = getPathFromStorageUrl(imageUrl);
  if (!filePath) {
    functions.logger.error("Could not parse file path from URL for project image:", imageUrl);
    throw new functions.https.HttpsError("invalid-argument", "Invalid Firebase Storage URL provided.");
  }

  // Security check: Ensure the user is deleting an image from their own folder
  if (!filePath.startsWith(`project-images/${context.auth.uid}`)) {
    throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete this file.");
  }

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    await file.delete();
    functions.logger.info(`User ${context.auth.uid} deleted project image: ${filePath}`);
    return { success: true, message: "Project image deleted successfully." };
  } catch (error: any) {
    if (error.code === 404) {
      functions.logger.warn(`Project image not found for deletion, assuming already deleted: ${filePath}`);
      return { success: true, message: "File did not exist." };
    }
    functions.logger.error(`Failed to delete project image ${filePath} for user ${context.auth.uid}`, error);
    throw new functions.https.HttpsError("internal", "Failed to delete project image.");
  }
});

export const deleteProfileImage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { imageUrl } = data;
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with an 'imageUrl' argument.");
  }

  const filePath = getPathFromStorageUrl(imageUrl);
  if (!filePath) {
    functions.logger.error("Could not parse file path from URL for profile image:", imageUrl);
    throw new functions.https.HttpsError("invalid-argument", "Invalid Firebase Storage URL provided.");
  }

  // Security check: Ensure the user is deleting their own profile image.
  if (!filePath.startsWith(`profile-images/${context.auth.uid}`)) {
    throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete this file.");
  }

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    await file.delete();
    functions.logger.info(`User ${context.auth.uid} deleted profile image: ${filePath}`);
    return { success: true, message: "Profile image deleted successfully." };
  } catch (error: any) {
    if (error.code === 404) {
      functions.logger.warn(`Profile image not found for deletion, assuming already deleted: ${filePath}`);
      return { success: true, message: "File did not exist." };
    }
    functions.logger.error(`Failed to delete profile image ${filePath} for user ${context.auth.uid}`, error);
    throw new functions.https.HttpsError("internal", "Failed to delete profile image.");
  }
});
