import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\d33cb6db-cfd6-4eff-858f-2cfd2dd5dc9a\\.system_generated\\logs\\transcript.jsonl');

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('closedFrontTex')) {
    try {
      const step = JSON.parse(line);
      console.log(`Step ${step.step_index}:`);
      const content = step.content || '';
      const lines2 = content.split('\n');
      lines2.forEach((l, idx) => {
        if (l.includes('closedFrontTex')) {
          console.log(`  L${idx}: ${l}`);
        }
      });
      if (step.tool_calls) {
        step.tool_calls.forEach(tc => {
          const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
          const code = args.CodeContent || '';
          const lines3 = code.split('\n');
          lines3.forEach((l, idx) => {
            if (l.includes('closedFrontTex')) {
              console.log(`  Arg L${idx}: ${l}`);
            }
          });
        });
      }
    } catch (e) {
      console.log('Error: ' + e.message);
    }
  }
});
