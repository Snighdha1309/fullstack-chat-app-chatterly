// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);