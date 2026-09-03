# Master Admin + Storage setup

## Master Admin
The existing admin page already identifies the master by the configured `SUPER_ADMIN_EMAIL`. The new Master Security tab is shown only to that account. Sub-admins retain their permission model and do not receive this tab.

Recommended policy:
- Sub-admin: create/edit/approve only according to permissions.
- Master: user/admin lifecycle, restore, cleanup and security settings.
- Permanent deletion should be server-side and audited.
- Back up Firestore before any bulk deletion.

## Cloudinary
Current unsigned preset: `ml_default`, cloud: `jjavsdh5`.
- Documents/PDFs: up to 4 MB.
- Profile/gallery photos: existing 400 KB UI limit is retained where applicable.
- Oversized images above 400 KB are resized/compressed client-side to JPEG quality 0.88, max side 2200px.
- PDFs are not falsely re-compressed; they are accepted up to 4 MB. For true PDF storage compression, use a server-side Ghostscript/Cloudinary transformation pipeline.

## Telegram
The browser no longer needs a Telegram bot token. For Telegram PDF relay, deploy `telegramPdfUpload` and set Firebase Secret `TELEGRAM_BOT_TOKEN` plus `TELEGRAM_CHAT_ID`. Never put the bot token in HTML/JS.

## Cloudinary usage
Set Firebase Secrets `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` and deploy `masterStorageOverview`. The Master Admin can then call the endpoint after adding the UI integration.

## Android
`android/` is a complete Android Studio module. Package: `com.xrayunion.maharashtra`. `google-services.json` is already copied into `android/app/`.
`FLAG_SECURE` is enabled for the app window, which is stronger than only enabling it on the PDF screen.
