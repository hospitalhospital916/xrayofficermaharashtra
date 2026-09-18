# Final Member Login Migration

Member authentication is intended to be Mobile Number + Password, independent of Firebase Authentication. Admin authentication remains Firebase Authentication.

## Required deployment

1. In `functions/`, run `npm install`.
2. Configure a strong `MEMBER_SESSION_SECRET` secret before production deployment.
3. Deploy Cloud Functions and Firestore Rules.
4. Existing approved members are initialized with bcrypt hash for `Pass@1234` on their first successful login and `mustChangePassword=true`.
5. Admin password-reset actions should use the new `adminResetMemberPasswordV2` endpoint and never expose plaintext passwords in Firestore.

## Important

The existing dashboard contains many direct Firestore reads. For production-grade security, those reads must be authorized with a server-side member session or Firebase App Check/rules design before treating the member portal as fully isolated from Firebase Authentication. This package changes the login/registration path and adds the secure backend password functions, but deployment and rules verification are still required.
