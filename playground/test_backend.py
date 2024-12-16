import requests

response = requests.post('http://localhost:5000/download-clip', json={
    'url': 'https://www.youtube.com/watch?v=Vf87n-p-q2k',
    'start_time': 5,  # Start at 30 seconds
    'end_time': 15     # End at 60 seconds
})


print(response)

# import yt_dlp
# from yt_dlp.utils import download_range_func
#
# url = 'https://www.youtube.com/watch?v=Vf87n-p-q2k'
# start_time = 5  # seconds
# end_time = 15   # seconds
#
#
#
# ydl_opts = {
#     'format': 'best',
#     'outtmpl': 'test_clip.%(ext)s',
#     'download_ranges': download_range_func(None, [(start_time, end_time)]),
#     'force_keyframes_at_cuts': True
# }
#
# try:
#     with yt_dlp.YoutubeDL(ydl_opts) as ydl:
#         ydl.download([url])
#
# except Exception as e:
#     print(f"Error during download: {str(e)}")  # Add logging
#

# import os
# from pathlib import Path
#
# with open(str(Path.home() / "Downloads/anan.txt") , "w") as f:
#     f.write("anani siekrim")
