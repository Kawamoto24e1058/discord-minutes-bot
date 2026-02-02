import { Client } from '@notionhq/client';

interface NotionConfig {
    apiKey: string;
    databaseId: string;
}

// ユーザーのデータ構造に合わせて柔軟に受け取るが、最低限必要なフィールドは定義
interface MinutesData {
    title: string;
    summary: string;
    next_actions: { who: string; what: string; due?: string }[];
    transcript?: string;
    username: string; // channelName
    createdAt?: string;
    category?: string;
    importance?: string;
}

export async function createNotionPage(data: MinutesData, config: NotionConfig) {
    if (!config.apiKey || !config.databaseId) {
        console.error('NOTION_API_KEY or NOTION_DATABASE_ID is not provided.');
        return null;
    }

    const notion = new Client({ auth: config.apiKey });

    try {
        console.log('--- [Notion Integration Start] ---');
        console.log(`Title: ${data.title}`);
        console.log(`Category: ${data.category}, Importance: ${data.importance}`);
        console.log('Sending minutes to Notion database...');

        // Next Actions (Array) を文字列に整形
        const nextActionsText = (data.next_actions || [])
            .map(action => `- ${action.who}: ${action.what} ${action.due ? `(Due: ${action.due})` : ''}`)
            .join('\n') || "特になし";

        const response = await notion.pages.create({
            parent: { database_id: config.databaseId },
            properties: {
                // 1. タイトル列：Name -> 題名
                "題名": {
                    title: [
                        {
                            text: {
                                content: data.title || "新規議事録",
                            },
                        },
                    ],
                },
                // 2. テキスト列：User -> ルーム
                "ルーム": {
                    rich_text: [
                        {
                            text: {
                                content: data.username || "不明なルーム",
                            },
                        },
                    ],
                },
                // 3. 日付列：Date -> 日付
                "日付": {
                    date: {
                        start: new Date().toISOString(),
                    },
                },
                // 4. カテゴリ列への流し込み
                "カテゴリ": {
                    select: { name: data.category || "定例会" }
                },
                // 5. 重要度列への流し込み
                "重要度": {
                    select: { name: data.importance || "中" }
                }
            },
            // 💡 ページの中身（本文）に要約とTODOを書き込む設定を追加
            children: [
                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{ text: { content: "📋 AI要約" } }]
                    },
                },
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{ text: { content: data.summary || "要約の生成に失敗しました。" } }]
                    },
                },
                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{ text: { content: "✅ 次のアクション (Next Actions)" } }]
                    },
                },
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{ text: { content: nextActionsText } }]
                    },
                },
            ],
        });

        console.log(`✅ Notion page created successfully! Page ID: ${response.id}`);
        console.log(`URL: https://www.notion.so/${response.id.replace(/-/g, '')}`);
        console.log('--- [Notion Integration Finished] ---\n');
        return response.id;
    } catch (error) {
        console.error("Notion API Error:", error);
        throw error;
    }
}
