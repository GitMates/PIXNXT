import fs from 'fs';

const logPath = 'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\d33cb6db-cfd6-4eff-858f-2cfd2dd5dc9a\\.system_generated\\logs\\transcript.jsonl';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
    if (line.includes('"step_index":62,')) {
        try {
            const step = JSON.parse(line);
            const tc = step.tool_calls[0];
            const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
            console.log(`Original CodeContent length in log: ${args.CodeContent.length}`);
            fs.writeFileSync('src/components/smart-albums/3d/FlipBook.jsx', args.CodeContent, 'utf8');
            console.log('Saved FlipBook.jsx');
        } catch (e) {
            console.log('Error: ' + e.message);
        }
    }
}
