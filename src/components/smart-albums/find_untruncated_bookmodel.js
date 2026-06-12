import fs from 'fs';
import readline from 'readline';

const logs = [
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\90e9d5b3-ef90-4a2d-b794-1074bf1566fe\\.system_generated\\logs\\transcript.jsonl',
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\d33cb6db-cfd6-4eff-858f-2cfd2dd5dc9a\\.system_generated\\logs\\transcript.jsonl',
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\46dcab67-80fc-4ee6-8f5e-84bb5b667cf5\\.system_generated\\logs\\transcript.jsonl'
];

logs.forEach(logPath => {
    if (!fs.existsSync(logPath)) return;
    console.log(`Checking ${logPath}...`);
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('BookModel.jsx') && line.length > 8000) {
            console.log(`  Line ${idx} has length ${line.length}`);
            try {
                const step = JSON.parse(line);
                console.log(`    Step ${step.step_index}: source=${step.source}, type=${step.type}`);
                if (step.tool_calls) {
                    step.tool_calls.forEach(tc => {
                        const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
                        const target = args.TargetFile || args.Target;
                        console.log(`      Tool: ${tc.name}, Target: ${target}`);
                        if (args.CodeContent) {
                            console.log(`      CodeContent length: ${args.CodeContent.length}`);
                        }
                    });
                }
            } catch (e) {
                console.log(`    Failed to parse: ${e.message}`);
            }
        }
    });
});
