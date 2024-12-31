let currentTab = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ timeSpent: {}, allTimeData: {} });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  updateCurrentTab(activeInfo.tabId);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    updateCurrentTab(null);
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs.length > 0) {
        updateCurrentTab(tabs[0].id);
      }
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTab && changeInfo.url) {
    updateCurrentTab(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTab) {
    finalizeCurrentTabTime();
    currentTab = null;
    
    updateSiteList();
  }
});

function updateCurrentTab(tabId) {
  const currentTime = Date.now();

  if (currentTab !== null) {
    finalizeCurrentTabTime();
  }

  if (tabId !== null) {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.url) return;

      const site = new URL(tab.url).hostname;
      chrome.storage.local.get("timeSpent", (result) => {
        let timeSpent = result.timeSpent || {};

        if (!timeSpent[site]) {
          timeSpent[site] = { time: 0, lastTimestamp: currentTime };
        } else {
          timeSpent[site].lastTimestamp = currentTime;
        }

        chrome.storage.local.set({ timeSpent });
      });
    });
  }

  currentTab = tabId;
}

function finalizeCurrentTabTime() {
  const currentTime = Date.now();

  chrome.tabs.get(currentTab, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;

    const site = new URL(tab.url).hostname;

    chrome.storage.local.get(["timeSpent", "allTimeData"], (result) => {
      let timeSpent = result.timeSpent || {};
      let allTimeData = result.allTimeData || {};

      if (timeSpent[site]) {
        timeSpent[site].time += currentTime - timeSpent[site].lastTimestamp;

        if (!allTimeData[site]) {
          allTimeData[site] = { time: 0 };
        }

        allTimeData[site].time += currentTime - timeSpent[site].lastTimestamp;

        chrome.storage.local.set({ timeSpent, allTimeData });
      }
    });
  });
}


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

      const siteDiv = document.createElement("div");
      siteDiv.textContent = `${site}: ${formattedTime}`;
      siteListDiv.appendChild(siteDiv);

      updatedTimeSpent[site] = {
        time: trackedTime,
        lastTimestamp: currentTime
      };
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

setInterval(() => {
  if (currentTab !== null) {
    updateCurrentTab(currentTab);
  }
}, 1000);
