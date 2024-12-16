import { ClipStore } from './utils/clipRepository';
import { YouTubeUtils } from './utils/youtubeUtils';
import { ClipListUI } from './ui/clipList';
import { NativeHostService } from './services/nativeHost';

class PopupManager {
    private clipListUI: ClipListUI;
    private nativeHost: NativeHostService;

    constructor() {
        this.clipListUI = new ClipListUI('clips-container');
        this.nativeHost = NativeHostService.getInstance();
    }

    async initialize(): Promise<void> {
        this.nativeHost.connect();
        await this.updateClipsList();
    }

    private async updateClipsList(): Promise<void> {
        const videoId = await YouTubeUtils.getCurrentVideoId();
        if (!videoId) return;

        const clips = await ClipStore.getClips(videoId);
        this.clipListUI.renderClips(videoId, clips);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const popup = new PopupManager();
    popup.initialize();
});