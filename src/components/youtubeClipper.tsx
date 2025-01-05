import React, { useState, useEffect } from 'react';
import { YouTubeUtils } from '../utils/youtubeUtils';
import { ClipStorageService } from '../services/clipStorageService';
import TimeRangeControl from "../ui/timeRangeControl.tsx";

interface TimeRange {
    start: number;
    end: number;
    downloaded?: boolean;
}

export const YouTubeClipper: React.FC = () => {
    const [currentVideoClips, setCurrentVideoClips] = useState<TimeRange[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentTabId, setCurrentTabId] = useState<number | null>(null);
    const [currentTabUrl, setCurrentTabUrl] = useState<string>(''); // New state
    const [videoDuration, setVideoDuration] = useState<number>(100); // Default value until real duration is loaded
    const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);


    const initializeTab = async () => {
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

            await chrome.runtime.sendMessage({ action: 'ENSURE_CONTENT_SCRIPT' });
            await loadClipsForCurrentVideo();

        } catch (error) {
            setErrorMessage('Failed to initialize');
            console.error('Tab initialization error:', error);
        }
    };

    const setVideoTime = async (seconds: number): Promise<boolean> => {
        if (!currentTabId) {
            console.error('setVideoTime: No currentTabId available');
            return false;
        }

        try {
            const response = await chrome.tabs.sendMessage(currentTabId, {
                action: 'SET_VIDEO_TIME',
                time: seconds  // The content script is already set up to handle this format
            }) as { success: boolean };

            if (!response || response.success === undefined) {
                console.error('setVideoTime: Invalid response');
                return false;
            }
            console.log("changed to",seconds)
            return response.success;
        } catch (error) {
            console.error('setVideoTime error:', error);
            setErrorMessage('Failed to set video time. Is the video loaded?');
            return false;
        }
    };
    const getDuration = async (): Promise<number | null> => {
        if (!currentTabId) {
            console.error('getDuration: No currentTabId available');
            return null;
        }
        try {
            const response = await chrome.tabs.sendMessage(currentTabId, {
                action: 'GET_VIDEO_TIME'
            }) as { duration: number | null };

            if (!response || response.duration === null || response.duration === undefined) {
                console.error('getDuration: Invalid response');
                return null;
            }

            return response.duration;
        } catch (error) {
            console.error('getDuration error:', error);
            setErrorMessage('Failed to get video duration. Is the video loaded?');
            return null;
        }
    };

    const loadClipsForCurrentVideo = async () => {
        try {
            const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
            if (!videoId) return;

            const allClips = await ClipStorageService.getAllClips();
            setCurrentVideoClips(allClips[videoId]?.clips || []);
        } catch (error) {
            setErrorMessage('Failed to load clips');
            console.error('Load clips error:', error);
        }
    };

    const handleNewClip = async () => {
        try {
            if (!currentTabId) {
                setErrorMessage('No active YouTube tab. Please refresh the extension');
                return;
            }

            const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
            if (!videoId) {
                setErrorMessage('Invalid YouTube URL. Please check the URL format');
                return;
            }

            const duration = await getDuration();
            if (duration === null) {
                setErrorMessage('Cannot access video duration. Please reload the YouTube page');
                return;
            }

            await ClipStorageService.saveClip(videoId, currentTabUrl, 0, duration);
            await loadClipsForCurrentVideo();
            setErrorMessage('');

        } catch (error) {
            console.error('New clip error:', error);
            setErrorMessage('Failed to save clip. Please try refreshing the page');
        }
    };
    const handleDownloadClip = async (index: number) => {
        const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
        if (!videoId) {
            console.error('No video ID found');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/download-clip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    startTime: currentVideoClips[index].start,
                    endTime: currentVideoClips[index].end,
                    format_id: 'best'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response not OK:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();

            if (data.success) {
                await loadClipsForCurrentVideo();
                setErrorMessage('');
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Full error details:', error);
            setErrorMessage('Failed to download clip: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClip = async (index: number) => {
        const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
        if (!videoId) return;

        try {
            await ClipStorageService.deleteClip(videoId, index);
            await loadClipsForCurrentVideo();
        } catch (error) {
            setErrorMessage('Failed to delete clip');
            console.error('Delete clip error:', error);
        }
    };

    const handleTimeChange = async (clipIndex: number, timeType: 'start' | 'end', newValue: number) => {
        try {
            const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
            if (!videoId)    return;

            // Get the current clip and make a clean copy
            const currentClip = {...currentVideoClips[clipIndex]};

            // Validate based on current values
            if (timeType === 'start') {
                if (newValue >= currentClip.end) {
                    setErrorMessage(`Invalid start time: ${newValue} must be less than end time: ${currentClip.end}`);
                    return;
                }
            } else if (timeType === 'end') {
                if (newValue <= currentClip.start) {
                    setErrorMessage(`Invalid end time: ${newValue} must be greater than start time: ${currentClip.start}`);
                    return;
                }
            }

            // Create updated clip
            const updatedClip = {
                ...currentClip,
                [timeType]: newValue
            };
            await setVideoTime(newValue);
            setCurrentVideoClips(prevClips => {
                const newClips = [...prevClips];
                newClips[clipIndex] = updatedClip;
                return newClips;
            });
            setUnsavedChanges(true);

            setErrorMessage('');
        } catch (error: unknown) {

            if (error instanceof Error) {
                console.error('Stack trace:', error.stack);
                setErrorMessage(`Failed to update ${timeType} time: ${error.message}`);
            } else {
                setErrorMessage(`Failed to update ${timeType} time: Unknown error`);
            }
        }
    };

    const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
// First useEffect for initial setup
    useEffect(() => {
        const initializeAll = async () => {
            await initializeTab();
            const duration = await getDuration();
            if (duration !== null) {
                setVideoDuration(duration);
            }
        };

        initializeAll();
    }, []); // Run only once on mount

// Second useEffect for handling URL changes
    useEffect(() => {
        const handleTabUpdate = async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
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
    }, []); // Run only once for setting up listeners

// Third useEffect to handle URL changes
    useEffect(() => {
        const updateForNewVideo = async () => {
            if (currentTabUrl && currentTabUrl.includes('youtube.com/watch')) {
                await loadClipsForCurrentVideo();
                const duration = await getDuration();
                if (duration !== null) {
                    setVideoDuration(duration);
                }
            }
        };

        updateForNewVideo();  
    }, [currentTabUrl]); // Run whenever URL changes
    useEffect(() => {
        const saveAllChanges = async () => {
            const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
            if (!videoId || !unsavedChanges) return;

            try {
                for (let i = 0; i < currentVideoClips.length; i++) {
                    await ClipStorageService.updateClip(videoId, i, currentVideoClips[i]);
                }
                setUnsavedChanges(false);
            } catch (error) {
                console.error('Failed to save changes:', error);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveAllChanges();
            }
        };

        const handleSuspend = () => {
            saveAllChanges();
        };

        chrome.runtime.onSuspend.addListener(handleSuspend);
        window.addEventListener('blur', saveAllChanges);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', saveAllChanges);

        return () => {
            chrome.runtime.onSuspend.removeListener(handleSuspend);
            window.removeEventListener('blur', saveAllChanges);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', saveAllChanges);
            saveAllChanges();
        };
    }, [unsavedChanges, currentVideoClips, currentTabUrl]);
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
                                {!clip.downloaded && (
                                    <button
                                        onClick={() => handleDownloadClip(index)}
                                        className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600"
                                        disabled={isLoading}
                                    >
                                        Download
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
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};