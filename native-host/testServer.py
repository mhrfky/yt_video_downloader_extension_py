from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
import uuid
from datetime import datetime
from yt_dlp.utils import download_range_func
from pathlib import Path
from crossdomain_decorator import crossdomain
import subprocess

import ffmpeg


start_time = 0
end_time = 5
format_id = 'best'
DOWNLOAD_FOLDER = str(Path.home() / "Downloads")
url = "https://www.youtube.com/watch?v=QnvvdTujvOw"
download_id = str(uuid.uuid4())
output_template = f'{DOWNLOAD_FOLDER}/test.%(ext)s'

ydl_opts = {
    'format': format_id,
    'outtmpl': output_template,
    'download_ranges': download_range_func(None, [(start_time, end_time)]),
    'ffmpeg_location':  r'C:\ProgramData\chocolatey\bin\ffmpeg.exe',
    'force_keyframes_at_cuts': False,  # Disable keyframe forcing which requires ffmpeg
    'postprocessors': [],
    'external_downloader': None,
    # 'ignoreerrors' : True
} # Don't use external downloaders}
# ydl_opts = {
#     'format': format_id,
#     'outtmpl': output_template,
#     # Instead of using download_ranges, we'll use external downloader options
#     'external_downloader': 'native',  # Use native downloader
#     'external_downloader_args': {
#         'native': ['-fs', str(end_time - start_time)]  # Download only specific duration
#     },
#     'quiet': False,
#     'no_warnings': False,
#     'verbose': True,
# }
with yt_dlp.YoutubeDL(params=ydl_opts) as ydl:
    ydl.download([url])