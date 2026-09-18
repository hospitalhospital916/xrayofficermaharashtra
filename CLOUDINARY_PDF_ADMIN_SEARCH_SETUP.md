# Cloudinary PDF Centre

## Features
- Admin can upload PDF directly to Cloudinary from Admin > Member Folders.
- Admin can search Cloudinary PDFs by filename/public ID/keyword using a server-side Firebase Function.
- Member PDF uploads remain Pending until an Admin approves them.
- Approved member PDFs are published to `circulars` and can be notified to members using the existing workflow.
- Cloudinary API secret is never placed in browser code.

## Firebase Functions secrets
Set these secrets before deploying functions:
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

The browser upload continues to use the configured unsigned upload preset in the existing project. Keep the preset restricted to the intended file types/size in Cloudinary.

## Deploy
From the project root:
`firebase deploy --only functions`

## Password reset
Master Admin has a button to call `masterSetMemberDefaultPasswords`. It resets all non-pending/non-disabled member Auth accounts to `Pass@123` and creates Auth accounts when needed. Members can subsequently use Forgot Password or change their password.

Important: this action affects real Firebase Authentication accounts when the function is deployed and executed. Review the member list before pressing the button.
