import { startBot } from '$lib/server/bot';
import { building } from '$app/environment';

if (!building) {
    console.log('Initializing Discord Bot...');
    startBot();
}
