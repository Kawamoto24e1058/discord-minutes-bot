import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

interface AnalyzerConfig {
    groqApiKey: string;
    notionApiKey: string;
    notionDatabaseId: string;
}

export async function analyzeChatHistory(chatLog: string, channelName: string, config: AnalyzerConfig) {
    if (!config.groqApiKey) {
        console.error('GROQ_API_KEY is not provided.');
        return null;
    }

    const groq = new Groq({ apiKey: config.groqApiKey });

    try {
        console.log(`\n--- [Analysis Start] Channel: ${channelName} ---`);
        console.log(`Chat log length: ${chatLog.length} chars`);

        console.log('Step 1: Requesting summarization from Groq (Llama)...');

        const SYSTEM_PROMPT = `
あなたは桃山学院大学テック部の「自律型専属書記」です。
チャットログを分析し、**「後で読み返した時に最も価値がある議事録」**を作成してください。

指示待ちではなく、自律的に判断して必要な情報を追加してください。

■基本出力項目（必須）
1. 議題・本日のテーマ
2. 決定事項（結論）
3. 次のアクション（TODO）

■自律的追加項目（会話内容に応じて適宜追加すること）
- **技術的負債・懸念点**: API制限、ライブラリの非互換性、セキュリティリスクなど
- **ステークホルダーの要望**: 先生、大学事務局、企業側からの隠れたニーズや制約
- **アイデアの種**: 今回ボツになったが、将来役立ちそうなブレインストーミングの内容
- **リソース状況**: メンバーの忙しさ、予算、機材不足などの運営課題
- **感情・雰囲気**: チームのモチベーション、議論の熱量（ポジティブ/ネガティブ）

■出力JSONフォーマット
必ず以下のJSON構造のみを出力してください。summary フィールド内はMarkdownで見出しを付けて構成してください。

{
  "title": "会議のタイトル",
  "category": "定例会 | 開発会議 | イベント準備 | 雑談・アイデア",
  "importance": "高 | 中 | 低",
  "summary": "（以下、Markdown形式で記述）\\n\\n## 🏁 決定事項\\n- [参加者A]: 〜〜〜\\n\\n## 💡 アイデアの種\\n- [参加者B]: 〜〜という案が出たが今回は見送り\\n\\n## ⚠️ 懸念点\\n- [参加者C]: 〜〜のリスクがある",
  "nextActions": "誰がいつまでに何をやるかのTODOリスト"
}

※「誰が言ったか」を必ず [名前]: 発言内容 の形式で記録する（文脈維持のため）。
※JSON以外のテキストは出力禁止。
`;

        const prompt = `
${SYSTEM_PROMPT}

対象のチャットログ:
"${chatLog}"
`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
        });

        const minutesJson = completion.choices[0]?.message?.content;
        console.log('✅ Summarization JSON received from Groq.');

        if (minutesJson) {
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const minutesDir = path.resolve('static/minutes');
            if (!fs.existsSync(minutesDir)) {
                fs.mkdirSync(minutesDir, { recursive: true });
            }

            const minutesFilename = `${channelName}_${timestamp}.json`;
            const minutesPath = path.join(minutesDir, minutesFilename);

            // Add metadata and Adapt to Notion format
            const rawData = JSON.parse(minutesJson);

            // Notion連携用にデータを整形 (Adapter Pattern)
            const finalData = {
                title: rawData.title || `[${rawData.category || 'その他'}] 議事録`, // Keep title clean or composed, user requested separate col for category so maybe clean title? User's prompt in previous turn suggested sticking them in title, but let's pass them through.
                category: rawData.category,
                importance: rawData.importance,
                summary: rawData.summary || '',
                next_actions: [{ who: 'See Details', what: rawData.nextActions || '特になし', due: '' }],
                transcript: chatLog,
                username: channelName,
                createdAt: new Date().toISOString()
            };

            // Notion連携用にURLを返すための準備
            let notionUrl = '';

            fs.writeFileSync(minutesPath, JSON.stringify(finalData, null, 2));
            console.log(`✅ Minutes saved to: ${minutesPath}`);

            // Send to Notion
            console.log('Step 2: Triggering Notion integration...');
            try {
                const { createNotionPage } = await import('./notion');
                const pageId = await createNotionPage(finalData, {
                    apiKey: config.notionApiKey,
                    databaseId: config.notionDatabaseId
                });
                if (pageId) {
                    notionUrl = `https://www.notion.so/${pageId.replace(/-/g, '')}`;
                }
            } catch (err) {
                console.error('❌ Error calling createNotionPage:', err);
            }

            console.log('--- [Analysis Finished Successfully] ---\n');
            return {
                ...finalData,
                url: notionUrl
            };
        } else {
            console.error('❌ No content received in summarization response.');
            return null;
        }

    } catch (error) {
        console.error('❌ [Analysis Failed] Error occurred during analysis process:');
        if (error instanceof Error) {
            console.error(`Message: ${error.message}`);
            console.error(`Stack: ${error.stack}`);
        } else {
            console.error(error);
        }
        console.error('----------------------------------------\n');
        return null;
    }
}
