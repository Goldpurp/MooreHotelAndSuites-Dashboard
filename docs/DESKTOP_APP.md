# Moore Hotels desktop application

The desktop application provides the Production staff dashboard as an
installable Windows application. It loads only
`https://admin.moorehotelandsuites.com/`, so the Production API connection stays
identical to the deployed web dashboard.

## Security

- Renderer sandboxing and context isolation are enabled.
- Node integration, webviews, insecure content, and Production developer tools
  are disabled.
- Navigation is locked to the configured dashboard origin.
- External HTTPS links open in the system browser.
- Invalid TLS certificates are rejected.
- Device permissions are denied; only dashboard notifications are allowed.
- The packaged app ignores Local/Development URL overrides.
- Background synchronization remains active while the window is minimized.

## Development

Open the deployed Production dashboard in the desktop shell:

```bash
npm run desktop
```

Run the Local Vite dashboard and desktop shell together:

```bash
npm run desktop:dev
```

The Local command still expects the Local API on `http://127.0.0.1:5222`.

## Windows installer

The `.github/workflows/desktop-release.yml` workflow builds the NSIS installer
on Windows.

1. Run **Desktop installer** manually for a test artifact.
2. Add `WINDOWS_CSC_LINK` and `WINDOWS_CSC_KEY_PASSWORD` repository secrets.
3. Push a tag such as `desktop-v1.0.0`.
4. Download the signed `Moore-Hotels-Dashboard-Setup-*.exe` from GitHub Releases.

Tagged public releases intentionally fail without signing credentials.
