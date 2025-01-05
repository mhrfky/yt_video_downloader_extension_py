// useClipManager.ts
import { useState, useEffect, useCallback } from 'react';
import { ClipStorageService } from '../services/clipStorageService';
import { YouTubeUtils } from '../utils/youtubeUtils';

interface TimeRange {
    start: number;
    end: number;
    downloaded?: boolean;
}

interface UseClipManagerProps {
    currentTabUrl: string;
    setVideoTime?: (time: number) => Promise<boolean>;
    onError?: (message: string) => void;
}

interface UseClipManagerResult {
    clips: TimeRange[];
    isLoading: boolean;
    unsavedChanges: boolean;
    handleNewClip: () => Promise<void>;
    handleDeleteClip: (index: number) => Promise<void>;
    handleDownloadClip: (index: number) => Promise<void>;
    handleTimeChange: (clipIndex: number, timeType: 'start' | 'end', newValue: number) => Promise<void>;
    saveAllChanges: () => Promise<void>;
}

export const useClipManager = ({
                                   currentTabUrl,
                                   setVideoTime,
                                   onError
                               }: UseClipManagerProps): UseClipManagerResult => {
    const [clips, setClips] = useState<TimeRange[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    const videoId = YouTubeUtils.getVideoIdFromUrl(currentTabUrl);

    const loadClipsForCurrentVideo = useCallback(async () => {
        if (!videoId) return;

        try {
            const allClips = await ClipStorageService.getAllClips();
            setClips(allClips[videoId]?.clips || []);
        } catch (error) {
            console.error('Load clips error:', error);
            onError?.('Failed to load clips');
        }
    }, [videoId, onError]);

    // Load clips when URL changes
    useEffect(() => {
        loadClipsForCurrentVideo();
    }, [loadClipsForCurrentVideo, currentTabUrl]);

    const saveAllChanges = async () => {
        if (!videoId || !unsavedChanges) return;

        try {
            for (let i = 0; i < clips.length; i++) {
                await ClipStorageService.updateClip(videoId, i, clips[i]);
            }
            setUnsavedChanges(false);
        } catch (error) {
            console.error('Failed to save changes:', error);
            onError?.('Failed to save changes');
        }
    };

    // Auto-save setup
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveAllChanges();
            }
        };

        const handleSuspend = () => {
            saveAllChanges();
        };

        // Set up auto-save listeners
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
    }, [unsavedChanges, clips, videoId]);

    const handleNewClip = async () => {
        if (!videoId) {
            onError?.('No active YouTube video found');
            return;
        }

        try {
            // Get current video time from content script
            const response = await chrome.tabs.sendMessage(
                await getCurrentTabId(),
                { action: 'GET_VIDEO_TIME' }
            ) as { currentTime: number; duration: number };

            await ClipStorageService.saveClip(
                videoId,
                currentTabUrl,
                response.currentTime,
                response.duration
            );

            await loadClipsForCurrentVideo();
        } catch (error) {
            console.error('New clip error:', error);
            onError?.('Failed to create new clip');
        }
    };

    const handleDeleteClip = async (index: number) => {
        if (!videoId) return;

        try {
            await ClipStorageService.deleteClip(videoId, index);
            await loadClipsForCurrentVideo();
        } catch (error) {
            console.error('Delete clip error:', error);
            onError?.('Failed to delete clip');
        }
    };

    const handleDownloadClip = async (index: number) => {
        if (!videoId) {
            onError?.('No video ID found');
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
                    startTime: clips[index].start,
                    endTime: clips[index].end,
                    format_id: 'best'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            if (data.success) {
                await loadClipsForCurrentVideo();
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Download error:', error);
            onError?.(error instanceof Error ? error.message : 'Failed to download clip');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTimeChange = async (clipIndex: number, timeType: 'start' | 'end', newValue: number) => {
        try {
            if (!videoId) return;

            const currentClip = {...clips[clipIndex]};

            // Validate time ranges
            if (timeType === 'start') {
                if (newValue >= currentClip.end) {
                    onError?.(`Start time (${newValue}) must be less than end time (${currentClip.end})`);
                    return;
                }
            } else {
                if (newValue <= currentClip.start) {
                    onError?.(`End time (${newValue}) must be greater than start time (${currentClip.start})`);
                    return;
                }
            }

            // Update video position if callback provided
            if (setVideoTime) {
                await setVideoTime(newValue);
            }

            // Update clip in state
            const updatedClip = {
                ...currentClip,
                [timeType]: newValue
            };

            setClips(prevClips => {
                const newClips = [...prevClips];
                newClips[clipIndex] = updatedClip;
                return newClips;
            });

            setUnsavedChanges(true);
        } catch (error) {
            console.error('Time change error:', error);
            onError?.(error instanceof Error ? error.message : 'Failed to update time');
        }
    };

    // Helper function to get current tab ID
    const getCurrentTabId = async (): Promise<number> => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) throw new Error('No active tab found');
        return tab.id;
    };

    return {
        clips,
        isLoading,
        unsavedChanges,
        handleNewClip,
        handleDeleteClip,
        handleDownloadClip,
        handleTimeChange,
        saveAllChanges
    };
};