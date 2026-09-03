# क्ष-किरण वैज्ञानिक अधिकारी संघटना — Portal/App upgrade

## Included upgrades
- Modern `NEW 🔔` circular banner directly under the member header.
- Circular click and FCM notification click deep-link to `secure-pdf.html`.
- Canvas-only PDF rendering with dynamic name/mobile/date-time watermark.
- Browser print/save/context-menu/copy/selection suppression (deterrence; not absolute DRM).
- Cloudinary PDF upload uses `raw/upload` and returns the actual Cloudinary error.
- Chat PDF upload no longer exposes a Telegram bot token in browser code.
- Firebase Cloud Function queues and sends FCM notifications securely with Admin SDK.

## Important security actions before production
1. **Rotate the Telegram bot token immediately** because the old ZIP contained the token in client-side JavaScript. Never put it in HTML/JS.
2. In Cloudinary create an **Unsigned Upload Preset** and enable PDF/raw uploads. If you do not want public PDF delivery, use a server-generated signed delivery URL instead of storing public URLs.
3. Deploy `functions` so `push_jobs` can send FCM.
4. For true access control, migrate member login to Firebase Auth and protect Firestore/Storage rules. A PWA/HTML page cannot guarantee screenshot prevention.
5. For a native Android WebView build, add `window` activity flag `FLAG_SECURE` on the PDF-reader Activity. The current repository contains no native Android source, so that native change cannot be safely inserted into this ZIP.

## Deploy
- Firebase Hosting: `firebase deploy --only hosting`
- Functions: `cd functions && npm install`, then from project root `firebase deploy --only functions`

## Circular data
`circulars/{id}`:
- title
- fileName
- fileUrl
- status: `Approved`
- publishedAt: epoch milliseconds
- category
- sourceMemberFileId

## Push job
`push_jobs/{id}`:
- title
- body
- data.url
- data.circularId
- status
- createdAt

