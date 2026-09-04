# Android app fixes – v2.0

- Unified login now correctly routes **Super Admin / Sub Admin / Member** accounts.
- Non-member emails are no longer treated as admin accounts.
- Firebase Auth persistence is enabled for smoother re-entry.
- Forgot-password flow fixed.
- Member PDF search/view flow retained and notification VAPID key corrected.
- Android native FCM tokens are stored in `fcm_tokens` for native push notifications.
- Android WebView receives a separate mobile-app visual polish layer so the app is visually distinct from the website.
