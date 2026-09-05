# Android Build Debug Fix

- GitHub Actions now runs `gradle --no-daemon :app:assembleDebug --info --stacktrace` so any remaining Kotlin compiler error shows the exact file and line.
- Java compile target is explicitly JVM 17.
- Kotlin JVM target is explicitly 17.
- Java toolchain is explicitly JDK 17.
- GitHub Actions uses Temurin JDK 17.

If the build fails after this change, open the failed `compileDebugKotlin` section in the Actions log. The exact Kotlin file and line will be shown.
