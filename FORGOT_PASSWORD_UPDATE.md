# Forgot Password Update

- Login page now provides a dedicated Forgot Password modal.
- Member can enter registered email OR 10-digit mobile number.
- Mobile number is resolved against the members collection to find the member's updated email/authEmail.
- The system uses Firebase `sendPasswordResetEmail()` to send a secure reset link.
- Default placeholder email `1234@gmail.com` and internal `@xrayunion.local` addresses are rejected for password reset; the member must first update and verify a real email in Profile.
- Existing Member Dashboard Forgot Password flow remains available and its instructions were updated.
- Firebase Console must have Email/Password authentication enabled and the deployed domain must be authorized.
