# Master password reset – deployment requirement

The Master Admin button **सर्व सदस्यांचा प्रारंभिक password सेट करा** calls:

`https://us-central1-xrayunionmah.cloudfunctions.net/masterSetMemberDefaultPasswords`

The ZIP contains the function in `functions/index.js`. The function must be deployed to the **xrayunionmah** Firebase project before the button can work.

## Deploy

From the project root:

```bash
firebase login
firebase use xrayunionmah
firebase deploy --only functions:masterSetMemberDefaultPasswords
```

If other functions in this project are also required, deploy all functions with:

```bash
firebase deploy --only functions
```

After deployment, open the live admin page again and run the Master Admin action once.

## What the function does

- Reads the `members` collection.
- Skips pending/disabled members.
- Finds the existing Firebase Auth user by email, or creates the internal placeholder account for members who still have no real email.
- Sets the initial password to `Pass@123`.
- Writes the Auth UID back to the member record.
- Does **not** store the plaintext password in Firestore.

## Why “Failed to fetch” appears

That message is a browser/network error when the requested HTTPS Cloud Function cannot be reached. It usually means the function has not been deployed, the deployed function is in another region/project, or the browser is unable to reach the endpoint. The updated admin page now shows a more useful deployment hint instead of only “Failed to fetch”.
