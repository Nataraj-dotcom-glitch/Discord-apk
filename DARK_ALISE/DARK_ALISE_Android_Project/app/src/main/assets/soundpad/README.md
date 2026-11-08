# DARK ALISE SoundPad v10.2 — Voice Mix Edition

This build routes soundboard playback into a mixed outbound WebRTC audio track where the website/browser uses a supported microphone-capture path. It also monitors soundboard playback locally.

## Install
1. Extract the ZIP.
2. Open the browser's extension manager.
3. Enable Developer mode where available.
4. Load the extracted folder as an unpacked extension.
5. Open WhatsApp Web or Discord, allow microphone permission normally, then reload the tab.

## Use
1. Open the floating DARK ALISE widget.
2. Add audio files.
3. Join a call and play a sound.
4. Ask a consenting call participant to confirm whether they can hear it.

## Important compatibility limits
- This is intended for desktop Chromium browsers that support Manifest V3 and MAIN-world content scripts.
- Firefox may need a separately packaged manifest/build.
- Chrome on Android does not support ordinary desktop extensions. Kiwi/other Android extension browsers vary by version and WebRTC implementation.
- Samsung Internet and Safari are not guaranteed to support this package.
- It works only in browser-based calls where the extension can intercept the outbound WebRTC audio path. It does not modify native WhatsApp mobile-app calls.
- WhatsApp/Discord can change their call implementation at any time; actual call transmission must be tested on each browser/version.
- The browser toolbar popup is controlled by the browser. The in-page floating soundboard is the movable widget.
- Use only with normal microphone permission and with call participants' consent.
