
export class YouTubePreciseController {
    private player: HTMLVideoElement | null = null;

    constructor() {
        this.initializePlayer();
    }

    initializePlayer(): boolean {
        console.log('Initialized player');
        this.player = document.querySelector('video');
        return !!this.player;
    }

    setTime(hours = 0, minutes = 0, seconds = 0, milliseconds = 0): boolean {
        if (!this.player) {
            const initialized = this.initializePlayer();
            if (!initialized || !this.player) {
                console.error('No video player available');
                return false;
            }
        }

        if (!this.validateTimeComponents(hours, minutes, seconds, milliseconds)) {
            return false;
        }

        try {
            const totalSeconds = this.calculateTotalSeconds(hours, minutes, seconds, milliseconds);
            this.player.currentTime = totalSeconds;
            return true;
        } catch (error) {
            console.error('Failed to set video time:', error);
            return false;
        }
    }

    private validateTimeComponents(hours: number, minutes: number, seconds: number, milliseconds: number): boolean {
        hours = Number(hours) || 0;
        minutes = Number(minutes) || 0;
        seconds = Number(seconds) || 0;
        milliseconds = Number(milliseconds) || 0;

        if (hours < 0 || minutes < 0 || seconds < 0 || milliseconds < 0) {
            return false;
        }
        if (minutes >= 60 || seconds >= 60) {
            return false;
        }
        if (milliseconds >= 1000) {
            return false;
        }
        return true;
    }

    private calculateTotalSeconds(hours: number, minutes: number, seconds: number, milliseconds: number): number {
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }

    getCurrentTime(): number | null {
        if (!this.player) return null;
        return this.player.currentTime;
    }

    getDuration(): number | null {
        if (!this.player) return null;
        return this.player.duration;
    }

    formatTime(timeInSeconds: number): string {
        if (timeInSeconds === null) return 'No video playing';
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }
}