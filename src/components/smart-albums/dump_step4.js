import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:\\Users\\26kav\\.gemini\\antigravity-ide\\brain\\46dcab67-80fc-4ee6-8f5e-84bb5b667cf5\\.system_generated\\logs\\transcript.jsonl');

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('"step_index":4,')) {
    try {
      const step = JSON.parse(line);
      console.log(`Content length: ${step.content ? step.content.length : 0}`);
      console.log(step.content);
    } catch (e) {
      console.log('Error parsing: ' + e.message);
    }
    rl.close();
  }
});
