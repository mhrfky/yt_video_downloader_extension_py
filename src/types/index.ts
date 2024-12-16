export interface Clip {
    videoId: string;
    startTime: number;
    endTime: number;
    url: string;
    timestamp: number;
}

export interface ClipsStorage {
    [videoId: string]: Clip[];
}

export interface NativeHostMessage {
    action: 'download';
    videoId: string;
    startTime: number;
    endTime: number;
}