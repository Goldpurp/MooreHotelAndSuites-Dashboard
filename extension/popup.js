const openButton = document.querySelector("#openDashboard");
const feedback = document.querySelector("#feedback");
const status = document.querySelector(".status");
const connectionStatus = document.querySelector("#connectionStatus");

function updateConnectivity() {
  const online = navigator.onLine;
  status.classList.toggle("offline", !online);
  connectionStatus.textContent = online
    ? "Secure production access"
    : "Internet connection unavailable";
}

async function handleOpenDashboard() {
  openButton.disabled = true;
  feedback.textContent = "";

  try {
    const result = await chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
    if (!result?.opened) {
      throw new Error(result?.message || "The dashboard could not be opened.");
    }
    window.setTimeout(() => window.close(), 120);
  } catch (error) {
    feedback.textContent =
      error instanceof Error ? error.message : "The dashboard could not be opened.";
    openButton.disabled = false;
  }
}

updateConnectivity();
window.addEventListener("online", updateConnectivity);
window.addEventListener("offline", updateConnectivity);
openButton.addEventListener("click", handleOpenDashboard);
