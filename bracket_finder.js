import fs from 'fs';

const content = fs.readFileSync('src/printstore/lab/LabArtworkReviewDetails.jsx', 'utf-8');

const stack = [];
let inString = false;
let stringChar = '';
let inComment = false;
let inRegex = false;

const lines = content.split('\n');

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  for (let colIdx = 0; colIdx < line.length; colIdx++) {
    const char = line[colIdx];
    const nextChar = line[colIdx + 1];

    if (inComment) {
      if (char === '*' && nextChar === '/') {
        inComment = false;
        colIdx++;
      }
      continue;
    }

    if (line.substring(colIdx, colIdx + 2) === '//') {
      break; // rest of line is comment
    }
    if (line.substring(colIdx, colIdx + 2) === '/*') {
      inComment = true;
      colIdx++;
      continue;
    }

    if (inString) {
      if (char === '\\') {
        colIdx++; // skip next char
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{' || char === '(' || char === '[') {
      stack.push({ char, line: lineIdx + 1, col: colIdx + 1 });
    } else if (char === '}' || char === ')' || char === ']') {
      if (stack.length === 0) {
        console.log(`Extra closing bracket '${char}' at line ${lineIdx + 1}, col ${colIdx + 1}`);
      } else {
        const last = stack[stack.length - 1];
        if (
          (char === '}' && last.char === '{') ||
          (char === ')' && last.char === '(') ||
          (char === ']' && last.char === '[')
        ) {
          stack.pop();
        } else {
          console.log(`Mismatched bracket: opened '${last.char}' at line ${last.line}, col ${last.col} but closed '${char}' at line ${lineIdx + 1}, col ${colIdx + 1}`);
          stack.pop();
        }
      }
    }
  }
}

console.log("Unclosed brackets on stack:", stack);
