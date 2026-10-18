FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -y -qq ffmpeg libcairo2 >/dev/null && pip install -q piper-tts cairosvg pillow fonttools
