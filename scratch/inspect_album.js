import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

// Mock localStorage for node environment since smartAlbumsService uses it
global.localStorage = {
    getItem: () => null,
    setItem: () => null,
    removeItem: () => null,
};

// Mock imported modules
// We'll import smartAlbumsService directly. Wait, we need to bypass vite environment variables
// by setting process.env variables
process.env.VITE_SUPABASE_URL = supabaseUrl;
process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY = supabaseAnonKey;

import { smartAlbumsService } from '../src/services/smartAlbums.service.js';

async function main() {
    const photographerId = 'f76246d6-8b1c-415e-8941-edd0e6228e66';
    const albumId = '295e50d5-6600-4746-955f-f8392f8638ca';
    
    try {
        const album = await smartAlbumsService.getAlbum(photographerId, albumId);
        console.log("Service getAlbum returned keys:", Object.keys(album));
        console.log("preview_data exists in returned album?", 'preview_data' in album);
    } catch (e) {
        console.error("Error calling service:", e);
    }
}

main();
