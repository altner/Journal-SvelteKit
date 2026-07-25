// Bootstrap a login account. No password anymore — login goes through IndieAuth (see
// src/lib/server/indieAuthLogin.ts); this just creates the local account row that
// MICROPUB_USER_EMAIL/the login callback resolve the session to.
// Usage: node --env-file=.env scripts/create-user.mjs "you@example.com" "Display Name"
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';

const [, , email, displayName] = process.argv;

if (!email) {
	console.error('Usage: node --env-file=.env scripts/create-user.mjs <email> [displayName]');
	process.exit(1);
}

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/create-user.mjs ...');
	process.exit(1);
}

const client = createClient({ url: process.env.DATABASE_URL });

await client.execute({
	sql: 'insert into user (id, email, display_name, created_at) values (?, ?, ?, ?)',
	args: [randomUUID(), email.trim().toLowerCase(), displayName || email.split('@')[0], Date.now()]
});

console.log(`User "${email}" created.`);
process.exit(0);
