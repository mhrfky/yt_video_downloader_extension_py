import { YouTubeClipper } from './components/youtubeClipper.tsx';

function App() {
    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-center mb-8">
                    YouTube Clip Downloader
                </h1>
                <YouTubeClipper />
            </div>
        </div>
    );
}

export default App;