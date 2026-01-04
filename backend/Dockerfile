FROM python:3.11-slim

WORKDIR /app

# システム依存関係のインストール（yt-dlp, Docker CLI, Node.js用）
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    docker.io \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# yt-dlpのインストール（最新版）
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Python依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ソースコードのコピー
COPY . .

# APIサーバー起動
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
