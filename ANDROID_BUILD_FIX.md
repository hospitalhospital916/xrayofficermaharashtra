# X-Ray Union Android Build Fix

Fixed GitHub Actions failure:
`Inconsistent JVM-target compatibility detected ... Java 1.8 and Kotlin 17`.

Changes:
- Java source/target = 17
- Kotlin jvmTarget = 17
- Kotlin JVM toolchain = 17
- GitHub Actions uses JDK 17 + Gradle 8.10.2
- Workflow builds the existing native `android` project (no Cordova/PortalApp)
- App label = X-Ray Union
- Package = com.xrayunion.maharashtra
- Version = 1.0.2 / versionCode 3
