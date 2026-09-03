# Firestore security recommendation
Do not rely on hidden UI for authorization. Enforce Master/Admin permissions in Firestore Rules and Cloud Functions.
At minimum, permanent deletion and Cloudinary/Telegram secrets must be server-side.
Example condition:
request.auth != null && request.auth.token.email == 'YOUR-MASTER-EMAIL'
Replace with the actual master account email and adapt to your existing rules before deployment.
