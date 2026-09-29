const connection = document.querySelector("#connection-status");
const connectionLabel = document.querySelector("#connection-label");
const installButton = document.querySelector("#install-button");
let installPrompt = null;

function updateConnection() {
  if (!connection || !connectionLabel) return;
  const offline = !navigator.onLine;
  connection.classList.toggle("offline", offline);
  connectionLabel.textContent = offline ? "Offline ready" : "Connected";
}

window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);
updateConnection();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  if (installButton) installButton.hidden = false;
});

installButton?.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(() => {
    if (connectionLabel && navigator.onLine) connectionLabel.textContent = "Offline cache unavailable";
  });
}
