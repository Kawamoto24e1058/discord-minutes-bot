# Render デプロイガイド

## 概要
このガイドでは、Discord Minutes Bot を Render にデプロイする手順を説明します。

## 前提条件
- Renderアカウント（無料プランで可）
- GitHubリポジトリにコードがプッシュされていること

## デプロイ手順

### 1. Blueprintを使用したデプロイ（推奨）

このプロジェクトには `render.yaml` が含まれているため、Blueprint を使用して簡単にデプロイできます。

1. [Render Dashboard](https://dashboard.render.com/) にログイン
2. **Blueprints** → **New Blueprint Instance** をクリック
3. GitHubリポジトリを接続
4. `render.yaml` が自動的に検出されます
5. 環境変数を設定（次のセクション参照）
6. **Apply** をクリック

### 2. 環境変数の設定

以下の環境変数を Render のダッシュボードで設定してください：

| 環境変数名 | 説明 | 例 |
|-----------|------|-----|
| `DISCORD_TOKEN` | Discord Bot トークン | `MTQ2NzA4...` |
| `DISCORD_CLIENT_ID` | Discord クライアント ID | `1467082648789717129` |
| `DISCORD_GUILD_ID` | Discord サーバー ID | `1461026949500637196` |
| `GROQ_API_KEY` | Groq API キー | `gsk_...` |
| `NOTION_API_KEY` | Notion API キー | `ntn_...` |
| `NOTION_DATABASE_ID` | Notion データベース ID | `2f9bbfad...` |
| `RENDER_URL` | **重要**: 自己ピング用 URL | `https://your-app-name.onrender.com` |
| `PORT` | ポート番号（自動設定） | `8080` |
| `NODE_ENV` | 環境（自動設定） | `production` |

> **⚠️ 重要**: `RENDER_URL` はデプロイ後に Render から提供される URL を設定してください。これにより自己ピング機能が動作し、スリープを回避できます。

### 3. RENDER_URL の設定

1. 初回デプロイ後、Render ダッシュボードで URL を確認
   - 例: `https://discord-minutes-bot-abc123.onrender.com`
2. **Environment** タブを開く
3. `RENDER_URL` の値を上記 URL に更新
4. **Save Changes** をクリック（自動的に再デプロイされます）

### 4. デプロイの確認

デプロイが完了したら、以下を確認してください：

1. **ヘルスチェック**: `https://your-app-name.onrender.com/health` にアクセス
   - レスポンス例:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-02-02T03:25:15.000Z",
     "botStatus": "online"
   }
   ```

2. **ログの確認**: Render ダッシュボードの **Logs** タブで以下を確認
   - ✅ `🟢 Discord Bot is Online! Logged in as ...`
   - ✅ `🌐 Health check server is running on http://localhost:8080`
   - ✅ `⏰ Self-ping scheduler started (every 10 minutes)`

3. **Discord での動作確認**
   - Discord サーバーでボットがオンラインになっているか確認
   - `/join` コマンドを実行して動作確認
   - `/save` コマンドで議事録作成を確認

## トラブルシューティング

### ボットが起動しない
- 環境変数が正しく設定されているか確認
- `DISCORD_TOKEN` が有効か確認
- ログで詳細なエラーメッセージを確認

### スリープしてしまう
- `RENDER_URL` が正しく設定されているか確認
- ログで `🔔 Self-ping to ...` が10分ごとに表示されているか確認
- 自己ピングが失敗している場合、URL が正しいか再確認

### ヘルスチェックが失敗する
- ポート `8080` が正しく設定されているか確認
- Express サーバーが起動しているか確認
- ファイアウォール設定を確認

## render.yaml の内容

プロジェクトルートの [render.yaml](file:///c:/Users/kharu/Project/discord-minutes-bot/render.yaml) には以下の設定が含まれています：

- **サービスタイプ**: Web サービス
- **ランタイム**: Node.js
- **プラン**: Free（無料）
- **ビルドコマンド**: `npm install && npm run build`
- **起動コマンド**: `npm run start`
- **ヘルスチェックパス**: `/health`
- **環境変数**: 上記の表を参照

## 費用

Render の無料プランでは以下が提供されます：
- 750時間/月の稼働時間
- 自動スリープ（15分間アクティビティがない場合）
  - **自己ピング機能により回避可能**
- 共有 CPU とメモリ

無料プランで十分に動作しますが、より高いパフォーマンスが必要な場合は有料プランへのアップグレードを検討してください。

## 参考リンク

- [Render 公式ドキュメント](https://render.com/docs)
- [Render Blueprint リファレンス](https://render.com/docs/blueprint-spec)
- [Discord.js ドキュメント](https://discord.js.org/)
