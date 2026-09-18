# Firebase Hosting Spark Deploy Fix

The previous GitHub Actions hosting deployment failed because Firebase Hosting was scanning repository executable files (including deployment scripts / repository metadata) while the project is on the Spark plan.

This package updates `firebase.json` so Hosting ignores:
- `.git/**`
- `.github/**`
- `android/**`
- `functions/**` (deploy Functions separately when required)
- shell/batch/PowerShell and native executable/library/object files

The website files remain deployable through Firebase Hosting.

## GitHub Actions

Keep using the existing `FirebaseExtended/action-hosting-deploy@v0` workflow. Push this project to GitHub and run the workflow again.

If Cloud Functions are needed, deploy them in a separate step/workflow with a Blaze billing plan; Hosting itself can continue to deploy the static website on Spark.
