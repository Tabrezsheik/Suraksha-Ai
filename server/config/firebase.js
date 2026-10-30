const dotenv = require('dotenv');
dotenv.config();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'medimate-5af1e';

let firebaseAdmin = null;

try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
      });
      firebaseAdmin = admin;
    } else {
      // Default app initialization with project ID for medimate-5af1e
      admin.initializeApp({
        projectId: FIREBASE_PROJECT_ID
      });
      firebaseAdmin = admin;
    }
  } else {
    firebaseAdmin = admin.app();
  }
} catch (err) {
  // Safe fallback logger if firebase-admin package is not loaded or missing credentials
  console.log(`[FirebaseConfig] Info: Firebase initialized in simulated mode for project ${FIREBASE_PROJECT_ID}`);
}

module.exports = {
  projectId: FIREBASE_PROJECT_ID,
  admin: firebaseAdmin,
  isAvailable: !!firebaseAdmin
};
