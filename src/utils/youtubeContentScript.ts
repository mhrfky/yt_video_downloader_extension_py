// src/utils/youtubeContentScript.ts

class YouTubeController {
    private player: HTMLVideoElement | null = null;
    private videoHistory: any[] = [];


    constructor() {
        this.initializePlayer();
        this.setupEventListeners();
        console.log('YouTube Controller initialized');
    }

    initializePlayer(): boolean {
        this.player = document.querySelector('video');
        console.log(this.player ? 'Found video player' : 'No video player found');
        return !!this.player;
    }

    setupEventListeners() {
        if (!this.player) return;

        this.player.addEventListener('play', () => {
            this.recordEvent('play');
        });

        this.player.addEventListener('pause', () => {
            this.recordEvent('pause');
        });

        this.player.addEventListener('seeking', () => {
            this.recordEvent('seek');
        });
    }

    recordEvent(eventType: string) {
        const currentTime = this.getCurrentTime();
        const timestamp = new Date().toISOString();

        const event = {
            type: eventType,
            videoTime: currentTime,
            timestamp: timestamp,
            formattedVideoTime: this.formatTime(currentTime)
        };

        this.videoHistory.push(event);
        console.log(`Video ${eventType} at ${this.formatTime(currentTime)}`);
    }

    setTime(hours = 0, minutes = 0, seconds = 0, milliseconds = 0): boolean {
        if (!this.player && !this.initializePlayer()) {
            console.error('Could not find video player');
            return false;
        }
        if (!this.player) return false;
        try {
            const totalSeconds = this.calculateTotalSeconds(hours, minutes, seconds, milliseconds);
            this.player.currentTime = totalSeconds;
            this.recordEvent('seek');
            console.log(`Set time to ${this.formatTime(totalSeconds)}`);
            return true;
        } catch (error) {
            console.error('Failed to set video time:', error);
            return false;
        }
    }

    getCurrentTime(): number {
        if (!this.player) return -1;
        return this.player.currentTime;
    }

    getDuration(): number {
        if (!this.player) return -1;
        return this.player.duration;
    }

    private calculateTotalSeconds(hours: number, minutes: number, seconds: number, milliseconds: number): number {
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }

    formatTime(timeInSeconds: number): string {
        if (timeInSeconds === -1) return 'No video playing';

        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

        return `${hours}h:${minutes}m:${seconds}s:${milliseconds}ms`;
    }
}

// Initialize controller and handle messages
const controller = new YouTubeController();

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    console.log('Received message:', request);

    switch (request.action) {
        case 'GET_VIDEO_TIME': {
            const currentTime = controller.getCurrentTime();
            const duration = controller.getDuration();
            console.log('Sending times:', { currentTime, duration });
            sendResponse({ currentTime, duration });
            break;
        }

        case 'SET_VIDEO_TIME': {
            if (request.time === undefined) {
                sendResponse({ success: false });
                return true;
            }
            const success = controller.setTime(0, 0, request.time);
            console.log('Set time result:', success);
            sendResponse({ success });
            break;
        }
    }
    return true; // Keep message channel open for async response
});

console.log('YouTube Controller content script loaded');