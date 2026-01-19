import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getRemoteConfig } from "firebase/remote-config";

const firebaseConfig = {
    apiKey: "AIzaSyArfeTkyJ0VyleDteHMJM_hJtC6iDiab80",
    authDomain: "popcorn-a3a65.firebaseapp.com",
    projectId: "popcorn-a3a65",
    storageBucket: "popcorn-a3a65.firebasestorage.app",
    messagingSenderId: "903083291092",
    appId: "1:903083291092:web:fccf0199968903b777a641",
    measurementId: "G-8XNERNHSLG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics
export const analytics = getAnalytics(app);

// Initialize Remote Config
export const remoteConfig = getRemoteConfig(app);

// Set default values for Remote Config
remoteConfig.defaultConfig = {
    min_required_version: "1.0.0",
    maintenance_mode_enabled: false,
    maintenance_message: "We are currently performing a scheduled maintenance. Please check back later."
};

// Fetch every 1 second in Dev, every 1 hour (3600000 ms) in Prod
remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 1000 : 3600000;
