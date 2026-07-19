// Bootstrap a login account.
// Usage: node --env-file=.env scripts/create-user.mjs "you@example.com" "your password" "Display Name"
import { createClient } from '@libsql/client';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';

const [, , email, password, displayName] = process.argv;

if (!email || !password) {
	console.error(
		'Usage: node --env-file=.env scripts/create-user.mjs <email> <password> [displayName]'
	);
	process.exit(1);
}

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/create-user.mjs ...');
	process.exit(1);
}

function hashPassword(pw) {
	const salt = randomBytes(16).toString('hex');
	const derived = scryptSync(pw, salt, 64).toString('hex');
	return `${salt}:${derived}`;
}

const client = createClient({ url: process.env.DATABASE_URL });

await client.execute({
	sql: 'insert into user (id, email, display_name, password_hash, created_at) values (?, ?, ?, ?, ?)',
	args: [
		randomUUID(),
		email.trim().toLowerCase(),
		displayName || email.split('@')[0],
		hashPassword(password),
		Date.now()
	]
});

console.log(`User "${email}" created.`);
process.exit(0);
