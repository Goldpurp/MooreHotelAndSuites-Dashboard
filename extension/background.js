const DASHBOARD_URL = "https://admin.moorehotelandsuites.com/";
const DASHBOARD_TAB_KEY = "mooreDashboardTabId";

async function rememberDashboardTab(tabId) {
  if (Number.isInteger(tabId)) {
    await chrome.storage.session.set({ [DASHBOARD_TAB_KEY]: tabId });
  }
}

async function forgetDashboardTab() {
  await chrome.storage.session.remove(DASHBOARD_TAB_KEY);
}

async function focusDashboardTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!Number.isInteger(tab.windowId)) throw new Error("Dashboard window unavailable.");

  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true, url: DASHBOARD_URL });
}

async function openDashboard() {
  const saved = await chrome.storage.session.get(DASHBOARD_TAB_KEY);
  const tabId = saved[DASHBOARD_TAB_KEY];

  if (Number.isInteger(tabId)) {
    try {
      await focusDashboardTab(tabId);
      return { opened: true, reused: true };
    } catch {
      await forgetDashboardTab();
    }
  }

  const tab = await chrome.tabs.create({ active: true, url: DASHBOARD_URL });
  await rememberDashboardTab(tab.id);
  return { opened: true, reused: false };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_DASHBOARD") return false;

  openDashboard()
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        opened: false,
        message: error instanceof Error ? error.message : "The dashboard could not be opened.",
      });
    });
  return true;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-dashboard") void openDashboard();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.get(DASHBOARD_TAB_KEY).then((saved) => {
    if (saved[DASHBOARD_TAB_KEY] === tabId) return forgetDashboardTab();
  });
});
