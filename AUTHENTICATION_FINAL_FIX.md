# Final Authentication Fix – 18 Sep 2026

- Removed the special client-side Firebase account auto-creation for `hangemahesh498@gmail.com`.
- Google Login now requires the member to enter their own registered/verified email first.
- `1234@gmail.com` is treated only as a default/example email and cannot start Google One-Click Login.
- Google authentication is allowed only after the email is found in the member collection and the member is not blocked/pending.
- Existing Firebase session persistence remains enabled.
- Email/password login and Forgot Password remain available.

Important: A first-time Google OAuth sign-in can still display Google's authentication/consent page. This is required by Google/Firebase security and cannot safely be removed by frontend code. After a successful sign-in, Firebase persistence prevents the authentication page from appearing again on that browser while the session remains valid.
