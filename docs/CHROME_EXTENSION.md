# Moore Hotels Chrome extension

The extension provides one-click access to the Production staff dashboard from
Chrome on Windows, macOS, Linux, and ChromeOS. It uses Chrome Manifest V3 and
does not contain or duplicate the dashboard itself.

## Privacy and security

- The only permission is `storage`.
- No browser-history, active-tab, content-script, clipboard, camera, microphone,
  location, or broad website access is requested.
- The extension does not read dashboard pages, API responses, credentials,
  access tokens, guest information, or hotel data.
- It stores only the temporary Chrome tab ID that it opened.
- The Production URL is fixed to
  `https://admin.moorehotelandsuites.com/`.
- All JavaScript is packaged locally.

## Test locally

1. Run `npm run extension:validate`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the repository's `extension` folder.
5. Pin the extension and click it, or use `Alt+Shift+M`.

## Build and publish

Run:

```bash
npm run extension:pack
```

The Chrome Web Store package is written to
`release/Moore-Hotels-Chrome-Extension-v1.0.0.zip`.

For staff distribution, upload the ZIP through the Chrome Web Store and use
Private or Unlisted visibility. Increment `version` in
`extension/manifest.json` before every update.

Chrome does not install ordinary extensions on Android or iOS. Staff on phones
and tablets should use the responsive Production web dashboard.
