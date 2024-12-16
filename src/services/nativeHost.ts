import { NativeHostMessage } from '../types';

export class NativeHostService {
    private static instance: NativeHostService;
    private port: chrome.runtime.Port | null = null;

    private constructor() {}

    static getInstance(): NativeHostService {
        if (!NativeHostService.instance) {
            NativeHostService.instance = new NativeHostService();
        }
        return NativeHostService.instance;
    }

    connect(): void {
        if (!this.port) {
            this.port = chrome.runtime.connectNative('127.0.0.1:5000');

            this.port.onMessage.addListener((message: any) => {
                console.log('Received from native host:', message);
            });

            this.port.onDisconnect.addListener(() => {
                console.log('Disconnected from native host');
                this.port = null;
            });
        }
    }

    sendMessage(message: NativeHostMessage): void {
        if (!this.port) {
            this.connect();
        }
        this.port?.postMessage(message);
    }
}