import { Clip, ClipsStorage } from '../types';

export class ClipStore {
    static async getClips(videoId: string): Promise<Clip[]> {
        const result = await chrome.storage.local.get(['clips']);
        const clips: ClipsStorage = result.clips || {};
        return clips[videoId] || [];
    }

    static async addClip(videoId: string, clip: Omit<Clip, 'timestamp'>): Promise<void> {
        const result = await chrome.storage.local.get(['clips']);
        const clips: ClipsStorage = result.clips || {};

        if (!clips[videoId]) {
            clips[videoId] = [];
        }

        clips[videoId].push({
            ...clip,
            timestamp: Date.now()
        });

        await chrome.storage.local.set({ clips });
    }

    static async removeClip(videoId: string, index: number): Promise<void> {
        const result = await chrome.storage.local.get(['clips']);
        const clips: ClipsStorage = result.clips || {};

        if (clips[videoId]) {
            clips[videoId].splice(index, 1);
            await chrome.storage.local.set({ clips });
        }
    }
}