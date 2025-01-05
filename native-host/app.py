from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
import uuid
from datetime import datetime
from yt_dlp.utils import download_range_func
from pathlib import Path
import ffmpeg
from crossdomain_decorator  import crossdomain
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Allow all origins
        "methods": ["GET", "POST", "OPTIONS"],  # Allow these methods
        "allow_headers": ["Content-Type", "Authorization"],  # Allow these headers
        "expose_headers": ["Content-Type", "Authorization"]  # Expose these headers
    }
})

DOWNLOAD_FOLDER = str(Path.home() / "Downloads")
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)


class DownloadManager:
    def __init__(self):
        self.downloads = {}

    def progress_hook(self, d):
        try:
            download_id = os.path.basename(d['filename']).split('.')[0]

            if d['status'] == 'downloading':
                downloaded = d.get('downloaded_bytes', 0)
                total = d.get('total_bytes', 0)
                progress = (downloaded / total * 100) if total > 0 else 0

                self.downloads[download_id] = {
                    'status': 'downloading',
                    'downloaded_bytes': downloaded,
                    'total_bytes': total,
                    'speed': d.get('speed', 0),
                    'eta': d.get('eta', 0),
                    'progress': progress if progress <= 100 else 100,
                    'filename': d['filename']
                }

            elif d['status'] == 'finished':
                if download_id in self.downloads:
                    self.downloads[download_id].update({
                        'status': 'finished',
                        'progress': 100,
                        'filename': d['filename']
                    })
                else:
                    self.downloads[download_id] = {
                        'status': 'finished',
                        'progress': 100,
                        'filename': d['filename']
                    }
        except Exception as e:
            print(f"Error in progress_hook: {str(e)}")
            self.downloads[download_id] = {
                'status': 'error_tracking',
                'error': str(e)
            }


download_manager = DownloadManager()


@app.route('/info', methods=['GET', 'OPTIONS'])
def get_video_info():
    if request.method == 'OPTIONS':
        return '', 204

    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        with yt_dlp.YoutubeDL() as ydl:
            info = ydl.extract_info(url, download=False)
            formats = [{
                'format_id': f.get('format_id'),
                'ext': f.get('ext'),
                'resolution': f.get('resolution'),
                'filesize': f.get('filesize'),
                'vcodec': f.get('vcodec'),
                'acodec': f.get('acodec')
            } for f in info.get('formats', [])]

            return jsonify({
                'title': info.get('title'),
                'duration': info.get('duration'),
                'thumbnail': info.get('thumbnail'),
                'formats': formats
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/download-clip', methods=['POST', 'OPTIONS'])
def download_clip():
    if request.method == 'OPTIONS':
        print('OPTIONS request')
        return '', 204
    print("request : ", request.get_json())
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        url = data.get('url')
        if not url:
            return jsonify({'error': 'URL is required'}), 400

        start_time = data.get('startTime', 0)
        end_time = data.get('endTime')
        format_id = data.get('format_id', 'best')
        print("clip range:",  start_time, end_time)
        download_id = str(uuid.uuid4())
        output_template = f'{DOWNLOAD_FOLDER}/{download_id}.%(ext)s'

        ydl_opts = {
            'format': format_id,
            'outtmpl': output_template,
            'download_ranges': download_range_func(None, [(start_time, end_time)]),
            'ffmpeg_location': r'C:\ProgramData\chocolatey\bin\ffmpeg.exe',
            'force_keyframes_at_cuts': False,  # Disable keyframe forcing which requires ffmpeg
            'postprocessors': [],
            'external_downloader': None,
            # 'ignoreerrors' : True
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        return jsonify({
            'success': True,
            'download_id': download_id,
            'message': 'Clip download started'
        })

    except Exception as e:
        print(f"Error during download: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/download', methods=['POST', 'OPTIONS'])
def download_video():
    if request.method == 'OPTIONS':
        return '', 204

    data = request.json
    url = data.get('url')
    format_id = data.get('format_id', 'best')

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    download_id = str(uuid.uuid4())
    output_template = f'{DOWNLOAD_FOLDER}/{download_id}.%(ext)s'

    ydl_opts = {
        'format': format_id,
        'outtmpl': output_template,
        'progress_hooks': [download_manager.progress_hook]
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return jsonify({
            'download_id': download_id,
            'message': 'Download started'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/progress/<download_id>', methods=['GET', 'OPTIONS'])
def get_progress(download_id):
    if request.method == 'OPTIONS':
        return '', 204

    progress = download_manager.downloads.get(download_id)
    if not progress:
        return jsonify({'error': 'Download not found'}), 404
    return jsonify(progress)


@app.after_request
def after_request(response):
    # Only add CORS headers if they haven't been added by flask-cors
    print("after request has been called")
    if not response.headers.get('Access-Control-Allow-Origin'):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

if __name__ == '__main__':
    app.run(debug=True, port=5000)