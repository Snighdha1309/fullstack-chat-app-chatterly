

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Only use analytics in browser (not during SSR or build)
let analytics;

const firebaseConfig = {
   apiKey: "AIzaSyDOs9fCDArxLlpVHNQ89KgOecEd5Z-H6Ds",
  authDomain: "emailauthchatterly.firebaseapp.com",
  projectId: "emailauthchatterly",
  storageBucket: "emailauthchatterly.firebasestorage.app",
  messagingSenderId: "871321271681",
  appId: "1:871321271681:web:1c914cc54561023dd4bc80",
  measurementId: "G-M0XWJT2Z5L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Optional: load analytics only in browser
if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

export { auth };
