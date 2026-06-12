import fs from 'fs';

const p = 'scratch/history.json';
if (!fs.existsSync(p)) {
    console.log('history.json does not exist');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('Keys in history.json:', Object.keys(data));
if (Array.isArray(data)) {
    console.log('Data is an array of length:', data.length);
    if (data.length > 0) {
        console.log('First element keys:', Object.keys(data[0]));
    }
} else {
    // Check if it has target files
    for (const [k, v] of Object.entries(data)) {
        console.log(`Key: ${k}, type: ${typeof v}, length/size: ${v ? v.length : 0}`);
    }
}
