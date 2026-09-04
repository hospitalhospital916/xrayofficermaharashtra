# Admin Login Fix

This build standardizes the web Firebase configuration across the Admin and member dashboard pages.

Admin login now:
- normalizes the admin email to lowercase;
- preserves the password exactly as entered;
- bootstraps the configured Master Admin Firebase Authentication account on the first login attempt if that account does not yet exist;
- keeps the authenticated Admin UI open even when a later Firestore data load has a non-authentication error;
- shows the actual Firebase error code/message when authentication fails.

Configured Master Admin email: hangemahesh498@gmail.com

Important: the Firebase Authentication Email/Password provider must be enabled in the Firebase project. The first Master Admin login creates the Firebase Auth account using the password entered on the Admin login screen. If the account already exists, the existing Firebase password must be used.
