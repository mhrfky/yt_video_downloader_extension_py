// src/components/YouTubeClipper.tsx
import React, { useState } from 'react';
import { TimeUtils } from '../utils/timeUtils';
import { YouTubeUtils } from '../utils/youtubeUtils';
import { Clip } from '../types';
const BACKEND_URL_DEV = 'http://localhost:5000';

export const YouTubeClipper: React.FC = () => {
    const [videoUrl, setVideoUrl] = useState('');
    const [startTime, setStartTime] = useState('0:00');
    const [endTime, setEndTime] = useState('0:00');
    const [clips, setClips] = useState<Clip[]>([]);
    const [errorMessage, setErrorMessage] = useState('');

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVideoUrl(e.target.value);
        setErrorMessage('');
    };

    const handleAddClip = () => {
        const videoId = YouTubeUtils.getVideoIdFromUrl(videoUrl);

        if (!videoId) {
            setErrorMessage('Invalid YouTube URL');
            return;
        }

        try {
            const start = TimeUtils.parseTime(startTime);
            const end = TimeUtils.parseTime(endTime);

            if (end <= start) {
                setErrorMessage('End time must be after start time');
                return;
            }

            const newClip: Clip = {
                videoId,
                startTime: start,
                endTime: end,
                url: videoUrl,
                timestamp: Date.now()
            };

            setClips(prevClips => [...prevClips, newClip]);
            setErrorMessage('');
        } catch (error) {
            setErrorMessage('Invalid time format. Please use MM:SS');
        }
    };

    const handleDownload = async (clip: Clip) => {
        try {
            // This will be replaced with actual download logic later
            console.log('Downloading clip:', clip);
            const response = await fetch(`${BACKEND_URL_DEV}/download-clip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clip),
                credentials: 'include',

            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            // Handle successful download
        } catch (error) {
            setErrorMessage('Failed to download clip');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
            YouTube URL
    </label>
    <input
    type="text"
    value={videoUrl}
    onChange={handleUrlChange}
    placeholder="https://www.youtube.com/watch?v=..."
    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
        </div>

        <div className="grid grid-cols-2 gap-4">
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
        Start Time (MM:SS)
    </label>
    <input
    type="text"
    value={startTime}
    onChange={(e) => setStartTime(e.target.value)}
    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
    />
    </div>
    <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        End Time (MM:SS)
    </label>
    <input
    type="text"
    value={endTime}
    onChange={(e) => setEndTime(e.target.value)}
    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
        </div>
        </div>

    {errorMessage && (
        <div className="text-red-500 text-sm">{errorMessage}</div>
    )}

    <button
        onClick={handleAddClip}
    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
        Add Clip
    </button>

    <div className="space-y-3 mt-6">
        {clips.map((clip, index) => (
                <div
                    key={clip.timestamp}
            className="border rounded p-3 flex justify-between items-center"
            >
            <div>
                <div className="font-medium">Video ID: {clip.videoId}</div>
                <div className="text-sm text-gray-600">
            {TimeUtils.formatTime(clip.startTime)} - {TimeUtils.formatTime(clip.endTime)}
            </div>
            </div>
            <div className="flex gap-2">
            <button
                onClick={() => handleDownload(clip)}
    className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600"
        >
        Download
        </button>
        <button
    onClick={() => setClips(clips.filter((_, i) => i !== index))}
    className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600"
        >
        Delete
        </button>
        </div>
        </div>
))}
    </div>
    </div>
    </div>
);
};