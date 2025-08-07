// File: main/server/src/lib/firebaseadmin.js

import dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// === Validation (Optional but recommended in dev) ===
const requiredEnv = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_AUTH_URI',
  'FIREBASE_TOKEN_URI',
  'FIREBASE_CERT_URL',
  'FIREBASE_CLIENT_CERT_URL'
];

const missingVars = requiredEnv.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error("❌ Missing Firebase env variables:", missingVars);
  process.exit(1); // Stop the app
}

// === Fix private_key format ===
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

// === Service Account Config ===
const firebaseServiceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

// === Initialize Admin App ===
const firebaseAdminApp = initializeApp({
  credential: cert(firebaseServiceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
});

const adminAuth = getAuth(firebaseAdminApp);

export { adminAuth, firebaseAdminApp };
