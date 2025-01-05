from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
import uuid
from datetime import datetime
from pathlib import Path

from yt_dlp import download_range_func

start_time = 0
end_time = 5
format_id = 'best'
DOWNLOAD_FOLDER = str(Path.home() / "Downloads")
url = "https://www.youtube.com/watch?v=ae4vTSpEX8g"
download_id = str(uuid.uuid4())
output_template = f'{DOWNLOAD_FOLDER}/{download_id}.%(ext)s'


ydl_opts = {
    'format': format_id,
    'outtmpl': output_template,
    'postprocessors': [],
    'prefer_ffmpeg': False,
    'format_sort': ['size'],
    'quiet': False,
    'verbose': True,
    'extract_flat': False,
    'fragment_retries': 10,
    'force_generic_extractor': False,
    'download_ranges': download_range_func(None, [(start_time, end_time)]),
    'ffmpeg_location':  r'C:\ProgramData\chocolatey\bin\ffmpeg.exe' ,
}

with yt_dlp.YoutubeDL(params=ydl_opts) as ydl:
    ydl.download([url])