# FINAL Login / Password / Storage Architecture

## Firebase Authentication provider setting
- The app no longer calls Firebase Email/Password sign-in for members or Admins.
- After the new Functions are deployed and the custom login is verified, Firebase Console > Authentication > Sign-in method can have **Email/Password disabled** and **Google disabled**.
- Firebase Authentication itself remains enabled because the app uses Firebase Custom Tokens only as the authenticated session layer.

## Member login
- Member email/password login is removed from the website UI.
- Google member login is removed.
- Member login uses registered 10-digit mobile number + password.
- Default password format: first name + `@1234`.
- Example: `Mahesh Hange` -> `Mahesh@1234`.
- New registration remains `Pending` and login is disabled until Admin approves it.
- Passwords are stored only as salted scrypt hashes in Firestore (`passwordHash`, `passwordSalt`), never as plaintext.
- Firebase Authentication is used only as an internal custom-token session after the custom mobile/password check. Firebase Email/Password provider is not required for member login.

## Forgot Password
- Member enters only mobile number.
- No reset email is sent.
- A `password_reset_requests` record is created server-side.
- Admin sees the request in the Password Reset Requests badge.
- Admin can reset one member's password and immediately receive the new password on screen.

## Admin password reset
- Member table key button opens individual password reset.
- Leaving the password as the member default sets `FirstName@1234`.
- Admin reset is performed by Cloud Function `adminSetMemberPassword`.
- Master bulk reset is performed by `masterSetMemberDefaultPasswords`.

## Admin login
- Admin login uses the custom `adminLogin` Cloud Function instead of Firebase Email/Password sign-in.
- Master Admin identifier: `hangemahesh498@gmail.com` or `mahesh`.
- Master Admin default password in this build: `Mahesh@1234` unless the `MASTER_ADMIN_PASSWORD` Functions secret is configured.
- Existing sub-admin plaintext `pass` values are migrated to scrypt hash on first successful custom login.
- New sub-admins no longer create Firebase Email/Password accounts.

## Storage / Master dashboard
The Master Security panel shows:
- Firestore total record count and collection breakdown
- Firebase Authentication user count
- Firebase Storage file count and bytes, when the bucket is available
- Cloudinary storage used in MB/bytes
- Cloudinary cloud name and plan, when API secrets are configured
- Cloudinary bandwidth used and resource usage, when available

Cloudinary API secrets must be configured as Firebase Functions secrets:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Optional master secret:
- `MASTER_ADMIN_PASSWORD`

Example setup commands:
```bash
firebase functions:secrets:set CLOUDINARY_CLOUD_NAME
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET
firebase functions:secrets:set MASTER_ADMIN_PASSWORD
firebase deploy --project xrayunionmah --only functions,firestore:rules,hosting
```

## Cloudinary member PDF upload fix
Member PDF upload had an undefined `keywords` variable. It is now read from the keywords input before the Firestore `member_files` record is created.

## GitHub deployment
- `.firebaseignore` excludes `.git`, `.github`, `android`, `functions`, and executable/native build files from Hosting.
- `.github/workflows/deploy-firebase.yml` deploys Functions + Firestore Rules + Hosting.
- `.github/workflows/merge.yml` is manual Hosting-only to avoid duplicate automatic deployments.
