# Selective Default Password Reset

- The Master Admin bulk action now resets `Pass@123` only for Approved/Active members whose real email is not yet Firebase-verified.
- Members with a real email and `emailVerified === true` are skipped.
- Each member can also be reset individually from Admin > Member Control > key icon.
- Individual reset supports either `Pass@123` (with forced first-login change) or a custom password.
- Passwords are never stored in Firestore in plaintext.
- Backend functions: `adminSetMemberPassword` and `masterSetMemberDefaultPasswords`.
