# EMAIL AUTHENTICATION + ONE-CLICK LOGIN UPDATE

Updated: 2026-09-18

## What changed

1. Added a clear member-facing notice:
   - `1234@gmail.com` is shown as a DEFAULT/EXAMPLE email only for legacy members.
   - Members are instructed to open Profile -> Edit Profile and enter their own real email.
   - The real email becomes the future Firebase Authentication login email after verification.

2. Replaced Google `signInWithPopup()` with Firebase `signInWithRedirect()`.
   - No browser popup window is used.
   - Google authentication happens through the normal redirect flow.
   - Firebase local persistence restores an existing authenticated session without showing a login window.

3. Added Firebase verified email update:
   - `verifyBeforeUpdateEmail()` sends a verification link to the new email.
   - The Firestore member record stores `pendingEmail` until the verification is completed.
   - On the next authenticated dashboard load, the verified email is synchronized to `members.email` / `members.ईमेल`.

4. Added Google account binding:
   - The first successful Google login for a member binds the Firebase UID.
   - A mismatched existing UID is rejected instead of silently linking another account.

5. Existing profile approval remains intact:
   - Other profile changes continue to go to `profile_edit_requests` for admin approval.
   - Email identity verification is handled separately for authentication security.

## Important Firebase Console requirements

The code cannot enable providers or authorized domains inside the Firebase Console. Verify that:
- Authentication -> Sign-in method -> Email/Password is enabled.
- Authentication -> Sign-in method -> Google is enabled.
- Authentication -> Settings -> Authorized domains contains the deployed website domain.
- The Google OAuth configuration for the Firebase project is valid.

## Data safety

This update does not delete existing member records, accounts, or files. It only writes authentication metadata (`uid`, `pendingEmail`, etc.) as part of the login/email verification flow.

## Expected member flow

Legacy member:
Mobile + existing password -> Dashboard -> email notice -> Profile -> enter real email -> Firebase verification email -> click verification link -> next login uses verified email.

Updated member:
Google One-Click / Email + Password -> Firebase Authentication -> dashboard.

