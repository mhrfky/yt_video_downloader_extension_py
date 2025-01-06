import React, { useState, useEffect } from 'react';
import { useClipManager } from '../hooks/useClipManager';
import TimeRangeControl from "../ui/timeRangeControl";
import { YouTubeUtils } from '../utils/youtubeUtils';

export const YouTubeClipper: React.FC = () => {
    const [errorMessage, setErrorMessage] = useState('');
    const [currentTabId, setCurrentTabId] = useState<number | null>(null);
    const [currentTabUrl, setCurrentTabUrl] = useState('');
    const [videoDuration, setVideoDuration] = useState<number>(100);

    const {
        clips: currentVideoClips,
        isLoading,
        queueLength,
        isDownloading,
        handleNewClip,
        handleDeleteClip,
        handleDownloadClip,
        handleTimeChange,
        loadClipsForCurrentVideo
    } = useClipManager({
        currentTabUrl,
        currentTabId,
        setErrorMessage,
    });

    const initializeTab = async () => {
        try {
            // Check if Chrome APIs are available
            if (typeof chrome === 'undefined' || !chrome.tabs) {
                setErrorMessage('Chrome extension APIs not available');
                return;
            }

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

            await chrome.runtime.sendMessage({ action: 'ENSURE_CONTENT_SCRIPT' });
            await loadClipsForCurrentVideo();
        } catch (error) {
            setErrorMessage('Failed to initialize');
            console.error('Tab initialization error:', error);
        }
    };

    // Initialize on mount
    useEffect(() => {
        const initializeAll = async () => {
            await initializeTab();
            if (currentTabId && chrome?.tabs) {
                try {
                    const response = await chrome.tabs.sendMessage(currentTabId, {
                        action: 'GET_VIDEO_TIME'
                    }) as { duration: number };
                    if (response?.duration) {
                        setVideoDuration(response.duration);
                    }
                } catch (error) {
                    console.error('Failed to get video duration:', error);
                }
            }
        };

        initializeAll();
    }, []);

    // Handle tab updates
    useEffect(() => {
        // Check if Chrome APIs are available
        if (typeof chrome === 'undefined' || !chrome.tabs) {
            return;
        }

        const handleTabUpdate = async (
            tabId: number,
            changeInfo: chrome.tabs.TabChangeInfo,
            tab: chrome.tabs.Tab
        ) => {
            if (changeInfo.url && tab.url?.includes('youtube.com/watch')) {
                setCurrentTabUrl(tab.url);
                setCurrentTabId(tabId);
            }
        };

        const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
            const tab = await chrome.tabs.get(activeInfo.tabId);
            if (tab.url?.includes('youtube.com/watch')) {
                setCurrentTabUrl(tab.url);
                setCurrentTabId(activeInfo.tabId);
            }
        };

        chrome.tabs.onUpdated.addListener(handleTabUpdate);
        chrome.tabs.onActivated.addListener(handleTabActivated);

        return () => {
            chrome.tabs.onUpdated.removeListener(handleTabUpdate);
            chrome.tabs.onActivated.removeListener(handleTabActivated);
        };
    }, []);

    // Handle URL changes
    useEffect(() => {
        const updateForNewVideo = async () => {
            if (currentTabUrl && currentTabUrl.includes('youtube.com/watch')) {
                await loadClipsForCurrentVideo();
                if (currentTabId && chrome?.tabs) {
                    try {
                        const response = await chrome.tabs.sendMessage(currentTabId, {
                            action: 'GET_VIDEO_TIME'
                        }) as { duration: number };
                        if (response?.duration) {
                            setVideoDuration(response.duration);
                        }
                    } catch (error) {
                        console.error('Failed to get video duration:', error);
                    }
                }
            }
        };

        updateForNewVideo();
    }, [currentTabUrl, currentTabId]);

    const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4">
                {errorMessage && (
                    <div className="text-red-500 text-sm">{errorMessage}</div>
                )}

                <button
                    onClick={handleNewClip}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                    disabled={isLoading || !videoId}
                >
                    New Clip at Current Time
                </button>

                <div className="space-y-3 mt-6">
                    {currentVideoClips.map((clip, index) => (
                        <div
                            key={index}
                            className={`border rounded p-3 space-y-2 ${
                                clip.downloaded ? 'bg-gray-50' : ''
                            }`}
                        >
                            <div className="clip_card">
                                <div className="font-medium">Clip {index + 1}</div>

                                <div className="p-2">
                                    <TimeRangeControl
                                        startTime={clip.start}
                                        endTime={clip.end}
                                        maxDuration={videoDuration}
                                        onStartChange={(value) => handleTimeChange(index, 'start', value)}
                                        onEndChange={(value) => handleTimeChange(index, 'end', value)}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    {!clip.downloaded && (
                                        <button
                                            onClick={() => handleDownloadClip(index)}
                                            className={`${
                                                isDownloading(index)
                                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                                    : 'bg-green-500 hover:bg-green-600'
                                            } text-white py-1 px-3 rounded`}
                                            disabled={isDownloading(index)}
                                        >
                                            {isDownloading(index) ? 'Downloading...' : 'Download'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteClip(index)}
                                        className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600"
                                        disabled={isLoading}
                                    >
                                        Delete
                                    </button>
                                </div>
                                {queueLength > 0 &&  (
                                    <div className="text-sm text-gray-600 mt-2">
                                        Queue position: {queueLength}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};