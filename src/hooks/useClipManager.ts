import { useState, useEffect } from 'react';
import { ClipStorageService } from '../services/clipStorageService';
import { YouTubeUtils } from '../utils/youtubeUtils';
import { useDownloadQueue } from './useDownloadQueue';

interface TimeRange {
    start: number;
    end: number;
    downloaded?: boolean;
}

interface UseClipManagerProps {
    currentTabUrl: string;
    currentTabId: number | null;
    setErrorMessage: (message: string) => void;
}

export const useClipManager = ({
                                   currentTabUrl,
                                   currentTabId,
                                   setErrorMessage,
                               }: UseClipManagerProps) => {
    const [currentVideoClips, setCurrentVideoClips] = useState<TimeRange[]>([]);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    const handleClipDownloadComplete = (videoId: string, index: number) => {
        setCurrentVideoClips(prevClips => {
            const newClips = [...prevClips];
            if (newClips[index]) {
                newClips[index] = {
                    ...newClips[index],
                    downloaded: true
                };
            }
            return newClips;
        });

        // Load clips in background
        ClipStorageService.getAllClips()
            .then(allClips => {
                setCurrentVideoClips(allClips[videoId]?.clips || []);
            })
            .catch(error => {
                console.error('Load clips error:', error);
                setErrorMessage('Failed to refresh clips');
            });
    };

    const { addToQueue, isProcessing, queueLength, isDownloading } = useDownloadQueue({
        onDownloadComplete: handleClipDownloadComplete,
        setErrorMessage
    });

    const saveAllChanges = () => {
        const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
        if (!videoId || !unsavedChanges) return;

        // Save in background
        Promise.all(
            currentVideoClips.map((clip, i) =>
                ClipStorageService.updateClip(videoId, i, clip)
            )
        ).then(() => {
            setUnsavedChanges(false);
        }).catch(error => {
            console.error('Failed to save changes:', error);
            setErrorMessage('Failed to save changes');
        });
    };

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveAllChanges();
            }
        };

        const handleSuspend = () => {
            saveAllChanges();
        };

        const handleBeforeUnload = () => {
            saveAllChanges();
        };

        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onSuspend?.addListener(handleSuspend);
        }

        window.addEventListener('blur', saveAllChanges);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.onSuspend?.removeListener(handleSuspend);
            }
            window.removeEventListener('blur', saveAllChanges);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            saveAllChanges();
        };
    }, [unsavedChanges, currentVideoClips, currentTabUrl]);

    const loadClipsForCurrentVideo = () => {
        const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
        if (!videoId) return;

        // Load in background
        ClipStorageService.getAllClips()
            .then(allClips => {
                setCurrentVideoClips(allClips[videoId]?.clips || []);
            })
            .catch(error => {
                setErrorMessage('Failed to load clips');
                console.error('Load clips error:', error);
            });
    };

    const setVideoTime = (seconds: number): Promise<boolean> => {
        if (!currentTabId) {
            console.error('setVideoTime: No currentTabId available');
            return Promise.resolve(false);
        }

        return chrome.tabs.sendMessage(currentTabId, {
            action: 'SET_VIDEO_TIME',
            time: seconds
        }).then((response: { success: boolean }) => {
            if (!response || response.success === undefined) {
                console.error('setVideoTime: Invalid response');
                return false;
            }
            return response.success;
        }).catch(error => {
            console.error('setVideoTime error:', error);
            setErrorMessage('Failed to set video time. Is the video loaded?');
            return false;
        });
    };

    const handleNewClip = () => {
        if (!currentTabId) {
            setErrorMessage('No active YouTube tab. Please refresh the extension');
            return;
        }

        const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
        if (!videoId) {
            setErrorMessage('Invalid YouTube URL. Please check the URL format');
            return;
        }

        // Create clip in background
        chrome.tabs.sendMessage(currentTabId, {
            action: 'GET_VIDEO_TIME'
        }).then((response: { currentTime: number; duration: number }) => {
            return ClipStorageService.saveClip(videoId, currentTabUrl, response.currentTime, response.duration);
        }).then(() => {
            loadClipsForCurrentVideo();
            setErrorMessage('');
        }).catch(error => {
            console.error('New clip error:', error);
            setErrorMessage('Failed to save clip. Please try refreshing the page');
        });
    };

    const handleTimeChange = (clipIndex: number, timeType: 'start' | 'end', newValue: number) => {
        const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
        if (!videoId) return;

        const currentClip = {...currentVideoClips[clipIndex]};

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

        // Update time in background
        setVideoTime(newValue).then(() => {
            setCurrentVideoClips(prevClips => {
                const newClips = [...prevClips];
                newClips[clipIndex] = {
                    ...currentClip,
                    [timeType]: newValue
                };
                return newClips;
            });
            setUnsavedChanges(true);
            setErrorMessage('');
        }).catch(error => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setErrorMessage(`Failed to update ${timeType} time: ${message}`);
        });
    };

    const handleDeleteClip = (index: number) => {
        const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
        if (!videoId) return;

        // Delete in background
        ClipStorageService.deleteClip(videoId, index)
            .then(() => {
                loadClipsForCurrentVideo();
            })
            .catch(error => {
                setErrorMessage('Failed to delete clip');
                console.error('Delete clip error:', error);
            });
    };

    const handleDownloadClip = (index: number) => {
        const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);
        if (!videoId) {
            console.error('No video ID found');
            return;
        }

        addToQueue({
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            startTime: currentVideoClips[index].start,
            endTime: currentVideoClips[index].end,
            format_id: 'best',
            index
        });
    };

    return {
        clips: currentVideoClips,
        isLoading: isProcessing,
        queueLength,
        isDownloading,
        unsavedChanges,
        loadClipsForCurrentVideo,
        handleNewClip,
        handleDeleteClip,
        handleDownloadClip,
        handleTimeChange,
    };
};