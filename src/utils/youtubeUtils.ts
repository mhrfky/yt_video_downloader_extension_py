export class YouTubeUtils {
    static getVideoIdFromUrl(url: string): string | null {
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
    }

    static getCurrentVideoId(): Promise<string | null> {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const url = tabs[0]?.url || '';
                    resolve(this.getVideoIdFromUrl(url));
                });
            } else {
                resolve(null);
            }
        });
    }
    static getDuration = async (currentTabId : number): Promise<number | null> => {
        const response = await chrome.tabs.sendMessage(currentTabId, {
            action: 'GET_VIDEO_TIME'
        }) as { duration: number | null };

        if (!response || response.duration === null || response.duration === undefined) {
            console.error('getDuration: Invalid response');
            return null;
        }
        return response.duration;
    }
    static setVideoTime = async (seconds: number, currentTabId : number): Promise<boolean> => {
        if (!currentTabId) {
            console.error('setVideoTime: No currentTabId available');
            return false;
        }

        try {
            const response = await chrome.tabs.sendMessage(currentTabId, {
                action: 'SET_VIDEO_TIME',
                time: seconds
            }) as { success: boolean };

            if (!response || response.success === undefined) {
                console.error('setVideoTime: Invalid response');
                return false;
            }

            return response.success;
        } catch (error) {
            console.error('setVideoTime error:', error);
            return false;
        }
    };
}
