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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.setAdvisorVerificationStatus = exports.onUserAccountDeleted = exports.deleteUserAccount = void 0;
__exportStar(require("./set-active-advisor-profile"), exports);
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const adminDb = (0, firestore_1.getFirestore)();
/**
 * A secure HTTP-callable function to initiate the user deletion process.
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const uid = context.auth.uid;
    try {
        await (0, auth_1.getAuth)().deleteUser(uid);
        return { message: `Successfully initiated deletion for user ${uid}.` };
    }
    catch (error) {
        logger.error("Error in deleteUserAccount function:", error);
        throw new functions.https.HttpsError('internal', 'An error occurred while trying to delete the user.', error.message);
    }
});
/**
 * Cascade delete on user removal
 */
exports.onUserAccountDeleted = functions.auth.user().onDelete(async (user) => {
    const uid = user.uid;
    logger.info(`Starting cascade delete for user: ${uid}`);
    const batch = adminDb.batch();
    batch.delete(adminDb.doc(`users/${uid}`));
    batch.delete(adminDb.doc(`publicAdvisorProfiles/${uid}`));
    const projects = await adminDb.collection("projects").where("ownerId", "==", uid).get();
    projects.forEach(doc => batch.delete(doc.ref));
    const matches = await adminDb.collection("matches").where("participants", "array-contains", uid).get();
    matches.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
});
/**
 * ✅ FIXED: Advisor verification function
 * This function now ONLY handles the verification status and notifications.
 * It NO LONGER automatically creates a public profile.
 */
exports.setAdvisorVerificationStatus = functions.https.onCall(async (data, context) => {
    logger.info("setAdvisorVerificationStatus invoked");
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const isAdmin = context.auth.uid === "Jv4XV8flpAgUqJpd2P7SKr3PijX2";
    if (!isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Admin access required.");
    }
    const { applicantId, applicationId, status } = data;
    if (!applicantId || !applicationId || !["verified", "rejected"].includes(status)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid parameters.");
    }
    const appRef = adminDb.doc(`users/${applicantId}/advisorApplications/${applicationId}`);
    const userRef = adminDb.doc(`users/${applicantId}`);
    const publicProfileRef = adminDb.doc(`publicAdvisorProfiles/${applicantId}`);
    const notificationRef = adminDb.collection(`users/${applicantId}/notifications`).doc();
    const batch = adminDb.batch();
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError("not-found", "User not found.");
    }
    const userData = userSnap.data();
    // Update application status
    batch.update(appRef, { verificationStatus: status });
    // If rejecting, check if it was the active profile and deactivate it.
    if (status === "rejected" && userData.activeAdvisorApplicationId === applicationId) {
        batch.delete(publicProfileRef);
        batch.update(userRef, { activeAdvisorApplicationId: admin.firestore.FieldValue.delete() });
    }
    // Create a notification for the user
    batch.set(notificationRef, {
        type: 'system',
        title: status === 'verified'
            ? 'Advisor Application Approved'
            : 'Advisor Application Rejected',
        message: status === 'verified'
            ? 'Congratulations! Your application has been verified. You can now set it as your active public profile.'
            : 'Your application was reviewed but not approved at this time.',
        link: '/profile#applications', // Direct link to the relevant section
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    // Update custom claims if rejecting a previously verified advisor
    if (status === "rejected") {
        const user = await admin.auth().getUser(applicantId);
        await admin.auth().setCustomUserClaims(applicantId, Object.assign(Object.assign({}, (user.customClaims || {})), { isAdvisor: false }));
    }
    return {
        success: true,
        message: `Application successfully ${status}.`,
    };
});
//# sourceMappingURL=index.js.map