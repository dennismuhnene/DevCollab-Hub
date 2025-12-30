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
exports.generateSignedUrl = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const uuid_1 = require("uuid");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
/**
 * Creates a signed URL that can be used to upload a file to a specific engagement.
 */
exports.generateSignedUrl = functions.https.onCall(async (data, context) => {
    // 1. Authentication and Authorization
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to upload files.');
    }
    const { engagementId, fileName, fileType } = data;
    const { uid } = context.auth;
    if (!engagementId || !fileName || !fileType) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with \'engagementId\', \'fileName\', and \'fileType\'.');
    }
    // 2. Verify the user is a participant in the engagement.
    const engagementRef = admin.firestore().collection('engagements').doc(engagementId);
    const engagementDoc = await engagementRef.get();
    if (!engagementDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'The specified engagement does not exist.');
    }
    const { developerId, advisorId } = engagementDoc.data();
    if (uid !== developerId && uid !== advisorId) {
        throw new functions.https.HttpsError('permission-denied', 'You do not have permission to upload files to this engagement.');
    }
    // 3. Generate a unique file path and the signed URL.
    const uniqueFileName = `${(0, uuid_1.v4)()}_${fileName}`;
    const filePath = `engagements/${engagementId}/${uniqueFileName}`;
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: fileType,
    };
    const [url] = await file.getSignedUrl(options);
    // 4. Return the URL and the final file path to the client.
    return { url, filePath };
});
//# sourceMappingURL=generate-upload-url.js.map