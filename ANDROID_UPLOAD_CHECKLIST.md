# X-Ray Union – Android Upload Checklist

## GitHub repository मध्ये काय upload करायचे
पूर्ण project च्या **आतील** `xrayofficermaharashtra-main` folder मधील सर्व files/folders repository root मध्ये upload करा.

### Android साठी महत्त्वाच्या files
- `.github/workflows/build-apk.yml` – native Android APK build workflow
- `android/app/build.gradle.kts` – package/version/build settings
- `android/app/src/main/AndroidManifest.xml` – app label/icon/permissions
- `android/app/src/main/res/values/strings.xml` – **X-Ray Union** app name
- `android/app/src/main/res/values/styles.xml` – Android theme/status/navigation colors
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png`
- `android/app/src/main/java/com/xrayunion/maharashtra/MainActivity.kt` – Android WebView/app interface
- `android/app/src/main/java/com/xrayunion/maharashtra/PortalFirebaseMessagingService.kt` – notifications
- `android/app/google-services.json` – Firebase Android configuration
- `android/build.gradle.kts`
- `android/settings.gradle.kts`
- `android/gradle.properties`

## GitHub Actions
Workflow आता Cordova/PortalApp वापरत नाही. तो existing `android` project build करतो आणि artifact नाव `xray-union-android-apk` आहे.

## App identity
- Package: `com.xrayunion.maharashtra`
- App name: `X-Ray Union`
- Version: `1.0.1` / versionCode `2`
- Website: `https://xrayunionmah.web.app/`

## Logo
Android launcher icons `logo.png` मधून तयार करून सर्व density folders मध्ये समान केले आहेत.
