import fs from 'fs';

const logs = [
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\90e9d5b3-ef90-4a2d-b794-1074bf1566fe\\.system_generated\\logs\\transcript.jsonl',
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\d33cb6db-cfd6-4eff-858f-2cfd2dd5dc9a\\.system_generated\\logs\\transcript.jsonl',
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\46dcab67-80fc-4ee6-8f5e-84bb5b667cf5\\.system_generated\\logs\\transcript.jsonl'
];

for (const logPath of logs) {
    if (!fs.existsSync(logPath)) continue;
    console.log(`=== LOG: ${logPath} ===`);
    const lines = fs.readFileSync(logPath, 'utf8').split('\n');
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const step = JSON.parse(line);
            if (step.type === 'VIEW_FILE') {
                // Find target path in content
                const content = step.content || '';
                const pathMatch = content.match(/File Path: `file:\/\/\/(.*)`/i);
                const pathStr = pathMatch ? pathMatch[1] : 'unknown';
                console.log(`  Step ${step.step_index}: VIEW_FILE target=${pathStr} (content len: ${content.length})`);
            }
        } catch (e) {}
    }
}
