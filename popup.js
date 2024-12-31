const TIME_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds

function updateSiteList() {
  chrome.storage.local.get("timeSpent", (data) => {
    const timeSpent = data.timeSpent || {};
    const siteListDiv = document.getElementById("site-list");
    siteListDiv.innerHTML = "";

    const currentTime = Date.now();

    let updatedTimeSpent = {};

    for (const site in timeSpent) {
      const siteData = timeSpent[site];
      const trackedTime = siteData.time + (currentTime - siteData.lastTimestamp);
      const formattedTime = formatTime(trackedTime);

      // Create site div element
      const siteDiv = document.createElement("div");
      siteDiv.textContent = `${site}: ${formattedTime}`;
      siteListDiv.appendChild(siteDiv);

      // Update the timeSpent object
      updatedTimeSpent[site] = {
        time: trackedTime,
        lastTimestamp: currentTime
      };

      // Check if time spent exceeds the threshold and trigger a notification
      if (trackedTime >= TIME_THRESHOLD) {
        showNotification(site, trackedTime);
      }
    }

    chrome.storage.local.set({ timeSpent: updatedTimeSpent });
  });
}

function formatTime(milliseconds) {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

function showNotification(site, trackedTime) {
  // Show a notification when the threshold is exceeded
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png", // Specify an icon image
    title: `Over Usage Alert!`,
    message: `You have spent more than 1 hour on ${site}. Time spent: ${formatTime(trackedTime)}`,
    priority: 2
  });
}

function removeSiteData(site) {
  chrome.storage.local.get("timeSpent", (data) => {
    let timeSpent = data.timeSpent || {};
    delete timeSpent[site];
    chrome.storage.local.set({ timeSpent }, () => {
      updateSiteList();
    });
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url) {
      const site = new URL(tab.url).hostname;
      removeSiteData(site);
    }
  });
});

function resetTimeData() {
  chrome.storage.local.set({ timeSpent: {} });
  updateSiteList();
}

document.getElementById("refresh").addEventListener("click", resetTimeData);

updateSiteList();
setInterval(updateSiteList, 1000);
