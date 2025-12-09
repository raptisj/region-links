chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("RegionLinks installed");

    chrome.storage.sync.set({ exportMode: "urls" });
  } else if (details.reason === "update") {
    console.log("RegionLinks updated");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return true;
});
