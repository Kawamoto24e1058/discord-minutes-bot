import fs from 'fs';
import path from 'path';

export async function load() {
    const minutesDir = path.resolve('static/minutes');
    if (!fs.existsSync(minutesDir)) {
        return { minutes: [] };
    }

    const files = fs.readdirSync(minutesDir).filter(file => file.endsWith('.json'));
    const minutes = files.map(file => {
        const filePath = path.join(minutesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error(`Error parsing ${file}:`, e);
            return null;
        }
    }).filter(m => m !== null).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { minutes };
}
