// clipStorageService.ts

interface TimeRange {
    start: number;
    end: number;
    downloaded?: boolean;
}

interface VideoClips {
    [videoId: string]: {
        url: string;
        clips: TimeRange[];
    };
}

export class ClipStorageService {
    private static STORAGE_KEY = 'video_clips';

    static async saveClip(videoId: string, url: string, start: number, end: number): Promise<void> {
        try {
            const allClips = await this.getAllClips();

            if (!allClips[videoId]) {
                allClips[videoId] = { url, clips: [] };
            }

            allClips[videoId].clips.push({
                start,
                end,
                downloaded: false
            });

            await chrome.storage.sync.set({ [this.STORAGE_KEY]: allClips });
        } catch (error) {
            console.error('Failed to save clip:', error);
            throw error;
        }
    }
    static async updateClip(videoId: string, index: number, updatedClip: TimeRange): Promise<void> {
        try {
            const allClips = await this.getAllClips();

            // Check if the video and clip exist
            if (!allClips[videoId] || !allClips[videoId].clips[index]) {
                throw new Error('Clip not found');
            }

            // Update the specific clip while preserving other properties
            allClips[videoId].clips[index] = {
                ...allClips[videoId].clips[index],  // Preserve existing properties like 'downloaded'
                ...updatedClip  // Apply the updates
            };

            // Save back to storage
            await chrome.storage.sync.set({ [this.STORAGE_KEY]: allClips });
        } catch (error) {
            console.error('Failed to update clip:', error);
            throw error;
        }
    }
    static async getAllClips(): Promise<VideoClips> {
        try {
            const result = await chrome.storage.sync.get(this.STORAGE_KEY);
            return result[this.STORAGE_KEY] || {};
        } catch (error) {
            console.error('Failed to get clips:', error);
            throw error;
        }
    }

    static async deleteClip(videoId: string, index: number): Promise<void> {
        try {
            const allClips = await this.getAllClips();
            if (allClips[videoId] && allClips[videoId].clips[index]) {
                allClips[videoId].clips.splice(index, 1);
                // Remove video entry if no clips remain
                if (allClips[videoId].clips.length === 0) {
                    delete allClips[videoId];
                }
                await chrome.storage.sync.set({ [this.STORAGE_KEY]: allClips });
            }
        } catch (error) {
            console.error('Failed to delete clip:', error);
            throw error;
        }
    }

    static async markClipAsDownloaded(videoId: string, index: number): Promise<void> {
        try {
            const allClips = await this.getAllClips();
            if (allClips[videoId] && allClips[videoId].clips[index]) {
                allClips[videoId].clips[index].downloaded = true;
                await chrome.storage.sync.set({ [this.STORAGE_KEY]: allClips });
            }
        } catch (error) {
            console.error('Failed to mark clip as downloaded:', error);
            throw error;
        }
    }

    static async clearDownloadedClips(): Promise<void> {
        try {
            const allClips = await this.getAllClips();

            // Filter out downloaded clips for each video
            Object.keys(allClips).forEach(videoId => {
                allClips[videoId].clips = allClips[videoId].clips.filter(clip => !clip.downloaded);
                // Remove video entry if no clips remain
                if (allClips[videoId].clips.length === 0) {
                    delete allClips[videoId];
                }
            });

            await chrome.storage.sync.set({ [this.STORAGE_KEY]: allClips });
        } catch (error) {
            console.error('Failed to clear downloaded clips:', error);
            throw error;
        }
    }
}