// config/firebase-admin.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Construct service account object from environment variables
const firebaseServiceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newline formatting
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

// Initialize Firebase Admin SDK
const firebaseAdminApp = initializeApp({
  credential: cert(firebaseServiceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

// Initialize services
const adminAuth = getAuth(firebaseAdminApp);

export { adminAuth, firebaseAdminApp };