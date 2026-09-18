# XRAY UNION — Login + Member PDF Approval Repair

## Login repair
- Universal `login.html` now continues to member routing even when a Firestore Rules configuration prevents a normal member from reading `admins`.
- Master admin email remains `hangemahesh498@gmail.com`.
- Member dashboard uses local Firebase Auth persistence.
- Registration link points to `member-registration.html`.

## PDF workflow
1. Member selects a folder and PDF.
2. Member upload is stored in `member_files` with `status: Pending`.
3. Admin opens **सदस्यांसाठी फोल्डर** and sees the Pending queue.
4. Admin can **मंजूर** or **नकार**.
5. Only Approved files are shown in the member document list.

## Search
Member PDF search indexes file name, keywords, description and folder name.

> Firebase Authentication provider and Firestore Rules still live in the Firebase Console. This ZIP does not invent or replace your Firebase credentials.
