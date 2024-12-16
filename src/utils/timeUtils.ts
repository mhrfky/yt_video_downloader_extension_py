export class TimeUtils {
    static formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    static parseTime(timeStr: string): number {
        const [minutes, seconds] = timeStr.split(':').map(Number);
        if (isNaN(minutes) || isNaN(seconds)) {
            throw new Error('Invalid time format');
        }
        return minutes * 60 + seconds;
    }
}