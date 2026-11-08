# DARK ALISE Android Client — v1.0

Android WebView shell inspired by the supplied XENOCORD screenshot. Opens WhatsApp Web inside a dark neon browser-style interface and bundles the two supplied DARK ALISE browser add-ons:
- Voice Studio Cross Browser v1.2
- SoundPad Voice Mix v10.2

## Build APK (GitHub Actions)
1. Upload the contents of this folder to a new GitHub repository (repository root must contain `settings.gradle`).
2. Open the repository's **Actions** tab.
3. Select **Build DARK ALISE APK** → **Run workflow**.
4. When complete, open the workflow run and download the `DARK-ALISE-APK` artifact. Extract it to get `app-debug.apk`.

## Important compatibility notes
- This project is an Android WebView client, not an official WhatsApp application. It uses WhatsApp Web and requires the user to sign in normally.
- WebView media capture and WhatsApp Web calling support vary by Android/WebView version. The app requests microphone/camera permissions when the website asks. Calls and outbound sound mixing must be tested on the target phone.
- The supplied add-ons were originally browser-extension scripts. They are injected into the WhatsApp Web page, but extension-only APIs and timing assumptions may not behave identically in Android WebView. The UI may load while some audio-routing features remain unsupported. No guarantee of call compatibility is made.
- The supplied Voice Studio contains simulated mute/deafen controls; those are not represented as actual WhatsApp call-state controls by this wrapper.
- Use the soundboard transparently and with the agreement of call participants. Never deny microphone/camera permission if you do not want to share them.
- This is unsigned debug output. A release APK needs a signing key and a separate release build configuration.
