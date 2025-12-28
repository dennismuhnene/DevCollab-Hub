"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setActiveAdvisorProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * ✅ FIXED: Toggles a user's active advisor profile.
 *
 * This function handles both activating a new profile and deactivating an existing one.
 */
exports.setActiveAdvisorProfile = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const userId = context.auth.uid;
    const { applicationId } = data;
    if (!applicationId || typeof applicationId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid "applicationId" string.');
    }
    const userRef = db.collection('users').doc(userId);
    const publicProfileRef = db.collection('publicAdvisorProfiles').doc(userId);
    const applicationRef = userRef.collection('advisorApplications').doc(applicationId);
    const batch = db.batch();
    try {
        const userDoc = await userRef.get();
        const appDoc = await applicationRef.get();
        if (!userDoc.exists || !appDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User or Application not found.');
        }
        const userData = userDoc.data();
        const appData = appDoc.data();
        if (appData.verificationStatus !== 'verified') {
            throw new functions.https.HttpsError('failed-precondition', 'Application must be verified.');
        }
        // Check if the user is trying to deactivate the currently active profile.
        const isDeactivating = userData.activeAdvisorApplicationId === applicationId;
        if (isDeactivating) {
            // DEACTIVATE logic
            batch.update(userRef, { activeAdvisorApplicationId: admin.firestore.FieldValue.delete() });
            batch.delete(publicProfileRef);
            await admin.auth().setCustomUserClaims(userId, Object.assign(Object.assign({}, (((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.customClaims) || {})), { isAdvisor: false }));
        }
        else {
            // ACTIVATE logic
            batch.update(userRef, { activeAdvisorApplicationId: applicationId });
            batch.set(publicProfileRef, {
                uid: userId,
                name: userData.name || "Anonymous Advisor",
                photoURL: userData.photoURL || null,
                headline: appData.headline,
                bio: appData.bio,
                specialties: appData.specialties || [],
                credentials: appData.credentials || [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp for consistency
            });
            await admin.auth().setCustomUserClaims(userId, Object.assign(Object.assign({}, (((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.customClaims) || {})), { isAdvisor: true }));
        }
        await batch.commit();
        return { success: true, message: isDeactivating ? 'Profile deactivated.' : 'Profile activated.' };
    }
    catch (error) {
        console.error('Error in setActiveAdvisorProfile:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An internal error occurred.');
    }
});
//# sourceMappingURL=set-active-advisor-profile.js.map