import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { spawn } from 'child_process';

export default defineConfig({
	plugins: [
		sveltekit(),
		{
			name: 'discord-bot-plugin',
			configureServer(server) {
				console.log('🔌 Discord Bot Plugin Initialized');

				// Botを別プロセスとして起動 (SvelteKitの$env依存を回避)
				const botProcess = spawn('npm', ['run', 'bot'], {
					stdio: 'inherit',
					shell: true
				});

				botProcess.on('error', (err: any) => {
					console.error('❌ Failed to start Discord Bot process:', err);
				});

				// Viteサーバー終了時にBotも終了
				process.on('exit', () => botProcess.kill());
				process.on('SIGINT', () => botProcess.kill());
				process.on('SIGTERM', () => botProcess.kill());
			}
		}
	]
});
