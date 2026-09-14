"use strict";

const path = require("node:path");
const {
  app,
  BrowserWindow,
  Menu,
  nativeTheme,
  session,
  shell,
} = require("electron");
const {
  isAllowedNavigation,
  isSafeExternalUrl,
  resolveStartUrl,
} = require("./url-policy.cjs");

const APP_ID = "com.moorehotelandsuites.dashboard";
const startUrl = resolveStartUrl({
  isPackaged: app.isPackaged,
  overrideUrl: process.env.MOORE_DESKTOP_START_URL,
});
const allowedOrigin = new URL(startUrl).origin;
const offlinePage = path.join(__dirname, "offline.html");
const appIcon = path.join(__dirname, "..", "build", "icon.png");

let mainWindow = null;

app.setAppUserModelId(APP_ID);
app.enableSandbox();
nativeTheme.themeSource = "dark";

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function openExternal(targetUrl) {
  if (isSafeExternalUrl(targetUrl)) void shell.openExternal(targetUrl);
}

function configureSession() {
  const appSession = session.defaultSession;
  const isTrustedSender = (webContents) => {
    try {
      return new URL(webContents.getURL()).origin === allowedOrigin;
    } catch {
      return false;
    }
  };

  appSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === "notifications" && isTrustedSender(webContents);
  });
  appSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === "notifications" && isTrustedSender(webContents));
  });

  appSession.webRequest.onBeforeRequest(
    { urls: ["http://*/*", "https://*/*"] },
    ({ url }, callback) => {
      const parsed = new URL(url);
      const allowed =
        parsed.protocol === "https:" ||
        (!app.isPackaged &&
          parsed.protocol === "http:" &&
          ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname));
      callback({ cancel: !allowed });
    },
  );
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: "#020617",
    icon: appIcon,
    title: "Moore Hotels & Suites",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      webSecurity: true,
      webviewTag: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (isAllowedNavigation(url, startUrl)) return;
    event.preventDefault();
    openExternal(url);
  });

  window.webContents.on(
    "did-fail-load",
    (_event, errorCode, _description, validatedUrl, isMainFrame) => {
      if (!isMainFrame || errorCode === -3 || validatedUrl.startsWith("file:")) return;
      void window.loadFile(offlinePage);
    },
  );

  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  void window.loadURL(startUrl);
  mainWindow = window;
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
});

app.on("certificate-error", (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(false);
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  configureSession();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
