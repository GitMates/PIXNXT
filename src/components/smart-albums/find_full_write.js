import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\90e9d5b3-ef90-4a2d-b794-1074bf1566fe\\.system_generated\\logs\\transcript.jsonl');

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('BookModel.jsx')) {
    try {
      const step = JSON.parse(line);
      console.log(`Step ${step.step_index}: source=${step.source}, type=${step.type}`);
      if (step.tool_calls) {
        step.tool_calls.forEach((tc, idx) => {
          if (tc.name === 'write_to_file' || tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
            const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
            const target = args.TargetFile || args.Target;
            console.log(`  Tool call ${tc.name} [${idx}]: target=${target}`);
            if (args.CodeContent) {
              console.log(`    CodeContent length: ${args.CodeContent.length}`);
            }
          }
        });
      }
    } catch (e) {
      console.log(`Failed to parse line: ${e.message}`);
    }
  }
});
