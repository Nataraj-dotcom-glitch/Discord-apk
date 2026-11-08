DARK ALISE — UNIVERSAL VOICE STUDIO
Version: 1.2.0

BRANDING UPDATE
- Extension name, interface labels, loading screen, icons and package documentation use DARK ALISE branding.
- Purple / violet neon theme replaces the previous blue-red palette.

BROWSER TARGETS
- Chromium desktop browsers supporting extensions: Chrome, Edge, Brave, Opera, Vivaldi and compatible browsers.
- Firefox desktop: requires browser-specific testing and signing/installation according to Firefox rules.
- Android: Kiwi may load compatible Chromium extensions; Firefox for Android depends on its add-on support and compatibility.

LIMITATIONS
- No single extension package works in literally every browser. Chrome Android and Samsung Internet do not generally load arbitrary desktop extensions. Safari requires a separately packaged Safari Web Extension.
- Native WhatsApp Android/iOS app calls are outside a browser extension's reach. This package targets WhatsApp Web pages.
- Branding changes do not prove that microphone processing reaches the other call participant. Test using a second device/account and normal consent.

INSTALLATION
Chromium desktop: extract the ZIP, open the browser's Extensions page, enable Developer mode, and choose Load unpacked. Select the extracted folder.
Firefox desktop: use temporary add-on installation for testing or sign/package the extension for normal distribution.

SUPPORTED SITE TARGETS
- https://web.whatsapp.com/*
- https://discord.com/*
- https://ptb.discord.com/*
- https://canary.discord.com/*
