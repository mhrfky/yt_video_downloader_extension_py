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
}
