
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

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

export const deleteProject = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be authenticated to delete a project.");
    }

    const { projectId } = data;
    if (!projectId || typeof projectId !== 'string') {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'projectId'.");
    }

    const uid = context.auth.uid;
    const projectRef = db.doc(`projects/${projectId}`);

    try {
        const projectSnap = await projectRef.get();
        if (!projectSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Project not found.");
        }

        const projectData = projectSnap.data();
        if (!projectData || projectData.ownerId !== uid) {
            throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete this project.");
        }

        const imageUrl = projectData.imageUrl;

        // Delete the Firestore document first.
        await projectRef.delete();
        functions.logger.info(`User ${uid} successfully deleted project document: ${projectId}`);

        // If an image URL exists, delete the image from storage.
        if (imageUrl && typeof imageUrl === 'string') {
            const filePath = getPathFromStorageUrl(imageUrl);
            if (filePath) {
                try {
                    const bucket = admin.storage().bucket();
                    const file = bucket.file(filePath);
                    await file.delete();
                    functions.logger.info(`Successfully deleted image ${filePath} for project ${projectId}.`);
                } catch (imageError: any) {
                    if (imageError.code === 404) {
                        functions.logger.warn(`Image ${filePath} for project ${projectId} not found, it might have been deleted already.`);
                    } else {
                        // Log the error but don't throw, as the primary doc is already deleted.
                        functions.logger.error(`Failed to delete image ${filePath} for project ${projectId}`, imageError);
                    }
                }
            }
        }

        return { success: true, message: "Project and associated image deleted successfully." };

    } catch (error: any) {
        functions.logger.error(`Error deleting project ${projectId} for user ${uid}:`, error);
        // Re-throw HTTPS errors, but wrap others for client-side clarity.
        if (error instanceof functions.https.HttpsError) {
            throw error; 
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred while deleting the project.");
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
      functions.logger.warn(`Profile image not found for deletion, a trekking already deleted: ${filePath}`);
      return { success: true, message: "File did not exist." };
    }
    functions.logger.error(`Failed to delete profile image ${filePath} for user ${context.auth.uid}`, error);
    throw new functions.https.HttpsError("internal", "Failed to delete profile image.");
  }
});
