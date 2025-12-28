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
exports.migrateAdvisorSlots = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Ensure Firebase is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * A one-time script to migrate existing advisor applications by adding a 'slot' number.
 * This function should be deployed and then triggered once by visiting its URL.
 * It is hardcoded to only affect the specified user's data.
 * After running successfully, this function should be removed from the codebase.
 */
exports.migrateAdvisorSlots = functions.https.onRequest(async (req, res) => {
    // HARDCODED User ID for safety. This script will only affect this user.
    const userId = '89Wct1oZkDUbBXtvvbKJDQ28quH2';
    try {
        const applicationsRef = db.collection('users').doc(userId).collection('advisorApplications');
        // Get applications ordered by when they were created
        const snapshot = await applicationsRef.orderBy('createdAt', 'asc').get();
        if (snapshot.empty) {
            res.status(200).send("No applications found for this user. Nothing to migrate.");
            return;
        }
        const batch = db.batch();
        let updatedCount = 0;
        // Iterate and assign a slot number based on creation order
        snapshot.docs.forEach((doc, index) => {
            const applicationData = doc.data();
            // Only update if the slot field is missing
            if (applicationData.slot === undefined || applicationData.slot === null) {
                const slotNumber = index + 1;
                batch.update(doc.ref, { slot: slotNumber });
                updatedCount++;
                console.log(`Assigning slot ${slotNumber} to application ${doc.id}`);
            }
        });
        if (updatedCount === 0) {
            res.status(200).send("All applications already have a slot number. Nothing to migrate.");
            return;
        }
        // Commit the batch update
        await batch.commit();
        res.status(200).send(`Successfully migrated ${updatedCount} applications for user ${userId}. You can now remove this function.`);
    }
    catch (error) {
        console.error("Error during migration:", error);
        res.status(500).send("An error occurred during migration. Check the function logs for details.");
    }
});
//# sourceMappingURL=migrate-advisor-slots.js.map