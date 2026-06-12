import fs from 'fs';
import path from 'path';

// Read .env file
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

async function main() {
    const url = `${supabaseUrl}/rest/v1/photographers?select=*`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        });
        
        if (!response.ok) {
            const errText = await response.text();
            console.error(`HTTP Error: ${response.status}`, errText);
            return;
        }
        
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

main();
