# Authentication & Password Recovery Fix

- Member registration now creates a Firebase Authentication account.
- Member passwords are no longer stored in Firestore for new registrations.
- Member dashboard uses email + password with Firebase Authentication.
- For legacy members without an email/Auth account, the first login requires mobile + the existing password + a real email address; the email is then linked to Firebase Authentication and the legacy password fields are cleared.
- Forgot Password is email-only and sends a Firebase reset link.
- Date of birth is never used to retrieve or reset a password.
- Login.html no longer falls back to comparing plaintext Firestore passwords.
- Members should use the same email/password account across login.html and member-dashboard.html.
