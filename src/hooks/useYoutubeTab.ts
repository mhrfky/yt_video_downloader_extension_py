import { useState, useEffect } from 'react';
import { YouTubeUtils } from '../utils/youtubeUtils';

interface UseYouTubeTabResult {
    currentTabId: number | null;
    currentTabUrl: string;
    videoDuration: number;
    errorMessage: string;
    isLoading: boolean;
    initializeTab: () => Promise<void>;
}

export const useYouTubeTab = (): UseYouTubeTabResult => {
    const [currentTabId, setCurrentTabId] = useState<number | null>(null);
    const [currentTabUrl, setCurrentTabUrl] = useState<string>('');
    const [videoDuration, setVideoDuration] = useState<number>(100);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const initializeTab = async (): Promise<void> => {
        setIsLoading(true);
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.id) {
                setErrorMessage('Cannot access current tab');
                return;
            }

            if (!tab.url?.includes('youtube.com/watch')) {
                setErrorMessage('Please open a YouTube video tab');
                return;
            }

            setCurrentTabId(tab.id);
            setCurrentTabUrl(tab.url);

            // Ensure content script is loaded
            await chrome.runtime.sendMessage({ action: 'ENSURE_CONTENT_SCRIPT' });

            // Use tab.id directly instead of currentTabId from state
            const duration = await YouTubeUtils.getDuration(tab.id);
            if (duration !== null) {
                setVideoDuration(duration);
            }

            setErrorMessage('');
        } catch (error) {
            setErrorMessage('Failed to initialize tab');
            console.error('Tab initialization error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const handleTabUpdate = async (
            tabId: number,
            changeInfo: chrome.tabs.TabChangeInfo,
            tab: chrome.tabs.Tab
        ) => {
            if (changeInfo.url && tab.url?.includes('youtube.com/watch')) {
                setCurrentTabUrl(tab.url);
                setCurrentTabId(tabId);
                // Use tabId parameter directly
                const duration = await YouTubeUtils.getDuration(tabId);
                if (duration !== null) {
                    setVideoDuration(duration);
                }
            }
        };

        const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
            const tab = await chrome.tabs.get(activeInfo.tabId);
            if (tab.url?.includes('youtube.com/watch')) {
                setCurrentTabUrl(tab.url);
                setCurrentTabId(activeInfo.tabId);
                // Use activeInfo.tabId directly
                const duration = await YouTubeUtils.getDuration(activeInfo.tabId);
                if (duration !== null) {
                    setVideoDuration(duration);
                }
            }
        };

        chrome.tabs.onUpdated.addListener(handleTabUpdate);
        chrome.tabs.onActivated.addListener(handleTabActivated);

        return () => {
            chrome.tabs.onUpdated.removeListener(handleTabUpdate);
            chrome.tabs.onActivated.removeListener(handleTabActivated);
        };
    }, []); // Empty dependency array as we want this to run once

    return {
        currentTabId,
        currentTabUrl,
        videoDuration,
        errorMessage,
        isLoading,
        initializeTab
    };
};