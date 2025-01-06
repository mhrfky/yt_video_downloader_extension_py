import { useState, useEffect } from 'react';

interface DownloadTask {
    videoId: string;
    url: string;
    startTime: number;
    endTime: number;
    format_id: string;
    index: number;
}

interface UseDownloadQueueProps {
    onDownloadComplete: (videoId: string, index: number) => void;
    setErrorMessage: (message: string) => void;
}

export const useDownloadQueue = ({
                                     onDownloadComplete,
                                     setErrorMessage
                                 }: UseDownloadQueueProps) => {
    const [downloadQueue, setDownloadQueue] = useState<DownloadTask[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadingIndices, setDownloadingIndices] = useState<Set<number>>(new Set());

    const processNextDownload = async () => {
        if (downloadQueue.length === 0 || isProcessing) return;

        setIsProcessing(true);
        const task = downloadQueue[0];
        setDownloadingIndices(prev => new Set(prev).add(task.index));

        try {
            const response = await fetch('http://localhost:5000/download-clip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    url: task.url,
                    startTime: task.startTime,
                    endTime: task.endTime,
                    format_id: task.format_id
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            if (data.success) {
                onDownloadComplete(task.videoId, task.index);
                setErrorMessage('');
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Download error:', error);
            setErrorMessage('Failed to download clip: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setDownloadQueue(queue => queue.slice(1));
            setDownloadingIndices(prev => {
                const next = new Set(prev);
                next.delete(task.index);
                return next;
            });
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        processNextDownload();
    }, [downloadQueue, isProcessing]);

    const addToQueue = (task: DownloadTask) => {
        if (downloadingIndices.has(task.index)) {
            setErrorMessage('This clip is already being downloaded');
            return;
        }
        setDownloadQueue(queue => [...queue, task]);
    };

    return {
        addToQueue,
        isProcessing,
        queueLength: downloadQueue.length,
        isDownloading: (index: number) => downloadingIndices.has(index)
    };
};