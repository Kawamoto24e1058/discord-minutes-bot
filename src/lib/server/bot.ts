import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, type Interaction, type ChatInputCommandInteraction, type TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cron from 'node-cron';

// .envファイルを読み込む
dotenv.config();

// 環境変数の取得
async function getEnv() {
    try {
        const { env } = await import('$env/dynamic/private');
        return env;
    } catch {
        return process.env;
    }
}

// Expressサーバーの設定（ヘルスチェック用）
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Discord Minutes Bot is running',
        timestamp: new Date().toISOString(),
        botStatus: client.isReady() ? 'online' : 'offline'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        botStatus: client.isReady() ? 'online' : 'offline'
    });
});

// サーバー起動
function startHealthCheckServer() {
    app.listen(PORT, () => {
        console.log(`🌐 Health check server is running on http://localhost:${PORT}`);
    });
}

// 自己ピング機能（Renderのスリープ回避）
function startSelfPing() {
    const renderUrl = process.env.RENDER_URL;

    if (!renderUrl) {
        console.log('⏭️  RENDER_URL is not set. Self-ping disabled.');
        return;
    }

    // 10分ごとに自分自身にアクセス
    cron.schedule('*/10 * * * *', async () => {
        try {
            console.log(`🔔 Self-ping to ${renderUrl}`);
            const response = await fetch(`${renderUrl}/health`);
            if (response.ok) {
                console.log(`✅ Self-ping successful: ${response.status}`);
            } else {
                console.log(`⚠️  Self-ping returned status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Self-ping failed:', error instanceof Error ? error.message : error);
        }
    });

    console.log('⏰ Self-ping scheduler started (every 10 minutes)');
}

// グローバル変数
declare global {
    var __discord_client: Client | undefined;
}

// クライアント作成 (Intentを変更)
const client = globalThis.__discord_client || new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.__discord_client = client;
}

// コマンド定義
const commands = [
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('録音を開始します（ここからの会話を議事録にします）'),
    new SlashCommandBuilder()
        .setName('save')
        .setDescription('チャット履歴を取得して議事録を作成します')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('取得するメッセージ数 (デフォルト: 100)')
                .setRequired(false)
        ),
];

// 録音状態管理 (ChannelID -> StartMessageID)
const recordingSessions = new Map<string, string>();

export async function startBot() {
    const currentEnv = await getEnv();
    if (!currentEnv.DISCORD_TOKEN) {
        console.error('❌ DISCORD_TOKEN is not set.');
        return;
    }

    if (client.isReady()) {
        console.log('🔄 Discord Bot is already online (HMR).');
        return;
    }

    client.removeAllListeners();

    client.once(Events.ClientReady, async (c) => {
        console.log("--- [DEBUG] Botが完全に起動しました ---");
        console.log(`🟢 Discord Bot is Online! Logged in as ${c.user.tag}`);
        const rest = new REST({ version: '10' }).setToken(currentEnv.DISCORD_TOKEN || '');
        try {
            console.log('Started refreshing application (/) commands.');
            await rest.put(
                Routes.applicationCommands(c.user.id),
                { body: commands },
            );
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error('❌ Failed to reload commands:', error);
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        console.log(`--- [DEBUG] 信号受信: ${interaction.commandName} ---`);

        // コマンドごとの処理分岐
        if (interaction.commandName === 'join') {
            try {
                // 返信してそのIDを記録
                await interaction.reply({ content: "🎙️ **議事録の録音を開始しました**\n(この時点からの会話を `/save` で記録します)", fetchReply: true });
                const replyMessage = await interaction.fetchReply();
                recordingSessions.set(interaction.channelId, replyMessage.id);
                console.log(`Started recording in ${interaction.channelId} from message ${replyMessage.id}`);
            } catch (error) {
                console.error("❌ Join Command Error:", error);
            }
        }

        if (interaction.commandName === 'save') {
            // 1. 最優先の即レス
            try {
                await interaction.deferReply(); // ephemeral: true は廃止推奨警告があったため外すか、必要なら残す
                console.log("--- DEBUG: deferReply SUCCESS ---");
            } catch (error) {
                console.error("❌ Top-level deferReply failed:", error);
                return;
            }

            // 2. 処理の非同期実行
            try {
                await handleSave(interaction);
            } catch (error) {
                console.error(`❌ Interaction Error (${interaction.commandName}):`, error);
                await interaction.editReply(`❌ システムエラー: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
        }
    });

    try {
        console.log('Logging in to Discord...');
        await client.login(currentEnv.DISCORD_TOKEN);
        // ログイン成功後にヘルスチェックサーバーを起動
        startHealthCheckServer();
        // 自己ピング機能を開始
        startSelfPing();
    } catch (error) {
        console.error('❌ Failed to login to Discord:', error);
    }
}

async function handleSave(interaction: ChatInputCommandInteraction) {
    try {
        await interaction.editReply("⏳ 処理を開始しました... (メッセージ取得準備中)");

        console.log("Executing handleSave logic...");
        const channel = interaction.channel as TextChannel;

        if (!channel || !channel.isTextBased()) {
            await interaction.editReply("❌ テキストチャンネルで実行してください。");
            return;
        }

        // Step 2: メッセージ取得
        let messages;
        const startId = recordingSessions.get(channel.id);

        try {
            if (startId) {
                console.log(`Fetching messages after ${startId}...`);
                await interaction.editReply("⏳ `/join` 以降のメッセージを取得しています...");
                // afterを指定して取得
                messages = await channel.messages.fetch({ after: startId, limit: 100 });
            } else {
                console.log('No recording session found. Fetching last 100 messages...');
                await interaction.editReply("⏳ 直近 100 件のメッセージを取得しています (Cache-Control: No-Cache)...");
                // フォールバック: 最新100件
                messages = await channel.messages.fetch({ limit: 100 });
            }
        } catch (fetchError: any) {
            console.error("❌ Message Fetch Error:", fetchError);
            if (fetchError.code === 50001) {
                await interaction.editReply("❌ **権限不足**: Botがメッセージ履歴を読む権限がありません。\n(Code: 50001)");
                return;
            }
            throw fetchError;
        }

        // Botのメッセージとシステムメッセージを除外
        // Collection so we can filter directly
        const filteredMessages = messages.filter(m => !m.author.bot);
        console.log(`✅ メッセージ取得完了 (Fetched: ${messages.size}, Filtered: ${filteredMessages.size})`);

        // Step 3: データ整形
        await interaction.editReply(`⏳ メッセージ取得完了 (${messages.size}件)。AI分析の準備中...`);

        const sortedMessages = Array.from(messages.values()).reverse();
        const chatLog = sortedMessages.map(m => {
            const author = m.author.username;
            const content = m.content;
            const time = m.createdAt.toLocaleTimeString('ja-JP');
            return `[${time}] ${author}: ${content}`;
        }).join('\n');

        if (!chatLog) {
            await interaction.editReply("❌ メッセージが見つかりませんでした。");
            return;
        }

        // Step 4: AI解析
        await interaction.editReply("⏳ AIが議事録を作成しています... (これには数秒〜数十秒かかります)");
        console.log("🚀 Calling Analyzer...");

        const { analyzeChatHistory } = await import('./analyzer');
        const currentEnv = await getEnv(); // Env is definitely available here or earlier
        const result = await analyzeChatHistory(chatLog, channel.name, {
            groqApiKey: currentEnv.GROQ_API_KEY || '',
            notionApiKey: currentEnv.NOTION_API_KEY || '',
            notionDatabaseId: currentEnv.NOTION_DATABASE_ID || ''
        });

        // Step 5: 完了報告
        if (result) {
            const content = `✅ **議事録作成完了**\n\n**タイトル**: ${result.title}\n**Notion**: [ページを開く](${result.url || '#'})`;
            await interaction.editReply(content);
        } else {
            await interaction.editReply("❌ 議事録の作成に失敗しました (AI応答なし)。");
        }

    } catch (error: any) {
        console.error("❌ Debug Catch Block:", error);
        try {
            await interaction.editReply(`❌ **エラーが発生しました**\n\`\`\`\n${error.message || error}\n\`\`\``);
        } catch (e) {
            console.error("Failed to report error to Discord:", e);
        }
    }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
    console.error('🔥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🌊 Unhandled Rejection at:', promise, 'reason:', reason);
});

// 単体起動用
const isMain = import.meta.url.endsWith(path.basename(process.argv[1] || ''));
if (isMain || process.env.BOT_STANDALONE === 'true') {
    startBot();
}
