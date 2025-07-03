import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";

// Initialize only once
if (getApps().length === 0) {
  admin.initializeApp({
    apiKey: "AIzaSyDOs9fCDArxLlpVHNQ89KgOecEd5Z-H6Ds",
  authDomain: "emailauthchatterly.firebaseapp.com",
  projectId: "emailauthchatterly",
  storageBucket: "emailauthchatterly.firebasestorage.app",
  messagingSenderId: "871321271681",
  appId: "1:871321271681:web:1c914cc54561023dd4bc80",
  measurementId: "G-M0XWJT2Z5L"
  });
}

export const auth = getAuth();