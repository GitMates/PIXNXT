import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\90e9d5b3-ef90-4a2d-b794-1074bf1566fe\\.system_generated\\logs\\transcript.jsonl');

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('frontTexture') && line.includes('BookModel.jsx')) {
    try {
      const step = JSON.parse(line);
      console.log(`\n=== MATCH in Step ${step.step_index} ===`);
      const content = step.content || '';
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (l.includes('frontTexture')) {
          console.log(`--- Content lines around index ${idx} ---`);
          const start = Math.max(0, idx - 15);
          const end = Math.min(lines.length, idx + 15);
          for (let j = start; j < end; j++) {
            console.log(`${j}: ${lines[j]}`);
          }
        }
      });
    } catch (e) {
      console.log('Error parsing: ' + e.message);
    }
  }
});
