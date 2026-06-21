/**
 * Applies Mobile Gallery tables to the linked Supabase project.
 * Requires SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens).
 *
 * Usage:
 *   set SUPABASE_ACCESS_TOKEN=sbp_... && node scripts/apply-mobile-gallery-db.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'oibvtecxxoqhvyejovsy';
const API_BASE = 'https://api.supabase.com/v1';

function loadToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }

  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, 'utf8').match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  const candidates = [
    path.join(process.env.APPDATA || '', 'supabase', 'access-token'),
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.supabase', 'access-token'),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        const token = fs.readFileSync(file, 'utf8').trim();
        if (token) return token;
      }
    } catch {
      /* try next */
    }
  }

  return null;
}

function loadSql() {
  return fs.readFileSync(path.join(__dirname, 'setup-mobile-gallery-db.sql'), 'utf8');
}

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter(Boolean);
}

async function runQuery(token, query) {
  const res = await fetch(`${API_BASE}/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Query failed (${res.status}): ${body.slice(0, 400)}`);
  }

  return body;
}

async function verifyTables(token) {
  const query = `
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'mobile_gallery_apps',
        'mobile_gallery_photos',
        'mobile_gallery_settings'
      )
    order by table_name;
  `;
  return runQuery(token, query);
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error(
      'Missing Supabase access token. Run `npx supabase login` or set SUPABASE_ACCESS_TOKEN.'
    );
    process.exit(1);
  }

  const sql = loadSql();
  const statements = splitStatements(sql);

  console.log(`Applying ${statements.length} SQL statements to ${PROJECT_REF}…`);

  for (const statement of statements) {
    const preview = statement.replace(/\s+/g, ' ').slice(0, 72);
    process.stdout.write(`→ ${preview}… `);
    try {
      await runQuery(token, statement);
      console.log('ok');
    } catch (err) {
      console.log('failed');
      throw err;
    }
  }

  const tables = await verifyTables(token);
  console.log('\nVerification:', tables);
  console.log('Mobile Gallery database setup complete.');
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
