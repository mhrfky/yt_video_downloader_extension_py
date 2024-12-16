import { Clip } from '../types';
import { TimeUtils } from '../utils/timeUtils';
import { NativeHostService } from '../services/nativeHost';

export class ClipListUI {
    private container: HTMLElement;
    private nativeHost: NativeHostService;

    constructor(containerId: string) {
        const element = document.getElementById(containerId);
        if (!element) throw new Error(`Container ${containerId} not found`);

        this.container = element;
        this.nativeHost = NativeHostService.getInstance();
    }

    renderClips(videoId: string, clips: Clip[]): void {
        this.container.innerHTML = '';

        clips.forEach((clip, index) => {
            const clipElement = this.createClipElement(clip, videoId, index);
            this.container.appendChild(clipElement);
        });
    }

    private createClipElement(clip: Clip, videoId: string, index: number): HTMLDivElement {
        console.log(index)
        const div = document.createElement('div');
        div.className = 'clip-item';

        const timeRange = document.createElement('span');
        timeRange.textContent = `${TimeUtils.formatTime(clip.startTime)} - ${TimeUtils.formatTime(clip.endTime)}`;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'Download';
        downloadBtn.onclick = () => this.handleDownload(videoId, clip);

        div.appendChild(timeRange);
        div.appendChild(downloadBtn);

        return div;
    }

    private handleDownload(videoId: string, clip: Clip): void {
        this.nativeHost.sendMessage({
            action: 'download',
            videoId,
            startTime: clip.startTime,
            endTime: clip.endTime
        });
    }
}