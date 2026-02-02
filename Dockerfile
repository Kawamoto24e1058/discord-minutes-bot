# Discord Minutes Bot - Dockerfile
# FFmpegを含むNode.js環境でDiscordボットを実行

FROM node:20-slim

# システムパッケージのアップデートとFFmpegのインストール
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリの設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci --only=production

# アプリケーションのソースコードをコピー
COPY . .

# SvelteKitのビルド（必要な場合）
RUN npm run build || echo "Build step skipped or failed"

# ポート8080を公開
EXPOSE 8080

# 環境変数の設定
ENV NODE_ENV=production
ENV PORT=8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# アプリケーションの起動
CMD ["npm", "start"]
