// src/services/background.ts

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'ENSURE_CONTENT_SCRIPT') {
        ensureContentScriptInjected().then(sendResponse);
        return true;
    }
});

async function ensureContentScriptInjected() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab.url?.includes('youtube.com')) {
        return { success: false, error: 'Not a YouTube tab' };
    }

    if (!activeTab.id) {
        return { success: false, error: 'No tab ID' };
    }

    try {
        await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['contentScript.js']
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to inject content script' };
    }
}