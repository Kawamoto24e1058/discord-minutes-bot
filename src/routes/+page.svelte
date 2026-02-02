<script lang="ts">
    export let data;
</script>

<div class="container">
    <header>
        <h1>Discord Minutes Bot</h1>
        <p class="subtitle">Tech Dept. Meeting Logs</p>
    </header>

    <main>
        {#if data.minutes.length === 0}
            <div class="empty-state">
                <p>No minutes recorded yet. Join a voice channel and use /join!</p>
            </div>
        {/if}

        <div class="grid">
            {#each data.minutes as minute}
                <article class="card">
                    <div class="card-header">
                        <span class="tag">{minute.username}</span>
                        <span class="date">{new Date(minute.createdAt).toLocaleString()}</span>
                    </div>
                    <h2>{minute.title || 'Untitled Meeting'}</h2>
                    
                    <div class="section">
                        <h3>Summary</h3>
                        <p>{minute.summary}</p>
                    </div>

                    <div class="section">
                        <h3>Next Actions</h3>
                        <ul>
                            {#each minute.next_actions as action}
                                <li>
                                    <strong>{action.who}</strong>: {action.what} 
                                    {#if action.due}<span class="due">({action.due})</span>{/if}
                                </li>
                            {/each}
                        </ul>
                    </div>
                    
                    <details>
                        <summary>Transcript</summary>
                        <p class="transcript">{minute.transcript}</p>
                    </details>
                </article>
            {/each}
        </div>
    </main>
</div>

<style>
    :global(body) {
        background-color: #0d1117;
        color: #c9d1d9;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 0;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    header {
        text-align: center;
        margin-bottom: 3rem;
    }

    h1 {
        background: linear-gradient(135deg, #5865F2 0%, #00d4ff 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 3rem;
        margin: 0;
    }

    .subtitle {
        color: #8b949e;
        font-size: 1.2rem;
        margin-top: 0.5rem;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
    }

    .card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 12px;
        padding: 1.5rem;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        border-color: #5865F2;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }

    .tag {
        background: rgba(88, 101, 242, 0.2);
        color: #5865F2;
        padding: 0.2rem 0.6rem;
        border-radius: 20px;
        font-weight: 600;
    }

    .date {
        color: #8b949e;
    }

    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
        color: #ffffff;
    }

    .section {
        margin-bottom: 1.5rem;
    }

    h3 {
        color: #7ee787;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 0.5rem;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        margin-bottom: 0.5rem;
        padding-left: 1rem;
        border-left: 2px solid #30363d;
    }

    .due {
        color: #ff7b72;
        font-size: 0.9rem;
        margin-left: 0.5rem;
    }

    details {
        margin-top: 1rem;
        border-top: 1px solid #30363d;
        padding-top: 1rem;
    }

    summary {
        cursor: pointer;
        color: #8b949e;
        font-size: 0.9rem;
        transition: color 0.2s;
    }

    summary:hover {
        color: #5865F2;
    }

    .transcript {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: #8b949e;
        white-space: pre-wrap;
    }

    .empty-state {
        text-align: center;
        padding: 4rem;
        color: #8b949e;
    }
</style>
