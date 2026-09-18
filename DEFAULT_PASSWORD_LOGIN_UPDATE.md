# Default Password + Member Email Login Update

## Initial login
- Initial password for existing/approved members: `Pass@123`
- Members who still have the placeholder email `1234@gmail.com` (or no real email) can log in using their registered 10-digit mobile number + `Pass@123`.
- The system creates a unique internal Firebase Auth email per member (`member-<FirestoreDocId>@xrayunion.local`) so a shared placeholder email does not collide in Firebase Authentication.

## After profile email update
- Member opens Profile > Edit Profile and enters their own real email.
- Firebase sends a verification email using `verifyBeforeUpdateEmail`.
- After the member verifies the link, the verified real email is synchronized to the Firestore member record.
- Future login can use the member's real verified email and the same password.
- Google one-click login uses the verified real email and Firebase redirect authentication, avoiding a browser popup.

## Important one-time Firebase migration
The ZIP includes a callable HTTP Cloud Function named `masterSetMemberDefaultPasswords` in `functions/index.js`.
It is intentionally restricted to the master admin email `hangemahesh498@gmail.com` and requires POST body:
`{"confirm":"SET_DEFAULT_PASSWORDS"}`

Deploy the Functions after reviewing your Firebase rules and then invoke the function with a valid Firebase ID token from the master admin session. It will:
1. Skip pending/disabled members.
2. Create missing Firebase Auth accounts.
3. Reset existing member Auth passwords to `Pass@123`.
4. Assign unique internal Auth emails to members who still use `1234@gmail.com`/no email.
5. Store only `uid`, `authEmail`, and migration flags in Firestore; it does not store the password in Firestore.

## Security note
`Pass@123` is a shared initial password. Members should change it after first login. Never store plaintext passwords in Firestore. If you want to force a password change on first login, add a `mustChangePassword` flag and route members to a password-change screen before allowing normal access.
