import fs from 'fs';
import path from 'path';

const logs = [
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\90e9d5b3-ef90-4a2d-b794-1074bf1566fe\\.system_generated\\logs\\transcript.jsonl',
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\d33cb6db-cfd6-4eff-858f-2cfd2dd5dc9a\\.system_generated\\logs\\transcript.jsonl',
    'C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\46dcab67-80fc-4ee6-8f5e-84bb5b667cf5\\.system_generated\\logs\\transcript.jsonl'
];

const fileContents = {};

function cleanPath(p) {
    if (!p) return '';
    return p.toLowerCase()
        .replace(/\\/g, '/')
        .replace(/^"|"$/g, '')
        .replace(/^file:\/\/\//, '');
}

const targets = [
    'bookmodel.jsx',
    'bookscene.jsx',
    'flipbook.jsx',
    'bookscene.css',
    'flipbook.css',
    'book3dtextures.js'
];

for (const logPath of logs) {
    if (!fs.existsSync(logPath)) {
        console.log(`Log path not found: ${logPath}`);
        continue;
    }
    console.log(`Reading log: ${logPath}`);
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        let step;
        try {
            step = JSON.parse(line);
        } catch (e) {
            continue;
        }
        
        if (!step.tool_calls) continue;
        
        for (const tc of step.tool_calls) {
            const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
            if (!args) continue;
            
            const target = args.TargetFile || args.Target || args.TargetFileContent;
            if (!target) continue;
            
            const cleaned = target.toLowerCase();
            const matchedTarget = targets.find(t => cleaned.includes(t));
            if (!matchedTarget) continue;
            
            console.log(`Step ${step.step_index}: Tool=${tc.name}, Target=${matchedTarget}`);
            
            if (tc.name === 'write_to_file') {
                if (args.CodeContent) {
                    fileContents[matchedTarget] = args.CodeContent;
                    console.log(`  -> Wrote ${args.CodeContent.length} chars`);
                }
            } else if (tc.name === 'replace_file_content') {
                let current = fileContents[matchedTarget] || '';
                const targetText = args.TargetContent;
                const replacementText = args.ReplacementContent;
                if (current.includes(targetText)) {
                    fileContents[matchedTarget] = current.replace(targetText, replacementText);
                    console.log(`  -> Replaced text (new length: ${fileContents[matchedTarget].length})`);
                } else {
                    console.log(`  -> [WARN] target text not found for replacement!`);
                }
            } else if (tc.name === 'multi_replace_file_content') {
                let current = fileContents[matchedTarget] || '';
                if (args.ReplacementChunks) {
                    let successCount = 0;
                    for (const chunk of args.ReplacementChunks) {
                        const targetText = chunk.TargetContent;
                        const replacementText = chunk.ReplacementContent;
                        if (current.includes(targetText)) {
                            current = current.replace(targetText, replacementText);
                            successCount++;
                        }
                    }
                    fileContents[matchedTarget] = current;
                    console.log(`  -> Multi-replaced ${successCount}/${args.ReplacementChunks.length} chunks (new length: ${current.length})`);
                }
            }
        }
    }
}

console.log('\n--- Saving Reconstructed Files ---');
const pathMap = {
    'bookmodel.jsx': 'src/components/smart-albums/3d/BookModel.jsx',
    'bookscene.jsx': 'src/components/smart-albums/3d/BookScene.jsx',
    'flipbook.jsx': 'src/components/smart-albums/3d/FlipBook.jsx',
    'bookscene.css': 'src/components/smart-albums/3d/BookScene.css',
    'flipbook.css': 'src/components/smart-albums/3d/FlipBook.css',
    'book3dtextures.js': 'src/components/smart-albums/3d/book3dTextures.js'
};

for (const [matchedTarget, content] of Object.entries(fileContents)) {
    const relativeDestPath = pathMap[matchedTarget];
    if (!relativeDestPath) continue;
    const fullDestPath = path.resolve(relativeDestPath);
    const parentDir = path.dirname(fullDestPath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullDestPath, content, 'utf8');
    console.log(`Saved: ${fullDestPath} (${content.length} chars)`);
}
console.log('Done.');
