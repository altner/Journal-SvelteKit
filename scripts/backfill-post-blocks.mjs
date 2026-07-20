// One-time, idempotent migration: converts existing flat post.text / photo rows into the new
// postBlock model (a post's content becomes an ordered list of text/photo blocks).
// Usage: node --env-file=.env scripts/backfill-post-blocks.mjs
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/backfill-post-blocks.mjs');
	process.exit(1);
}

const client = createClient({ url: process.env.DATABASE_URL });

// Legacy `post.text` was rendered with `white-space: pre-wrap` — every single newline was a
// visible line break, and there was no markdown parsing at all. Converting it to markdown source
// without escaping would (a) reinterpret any coincidental markdown syntax (`# `, `- `, `* `, `>`,
// `_x_`, `` `x` ``, `[x]`) and (b) collapse single newlines into spaces (markdown only treats a
// blank line as a paragraph break). Both are visible regressions, so: escape markdown-significant
// characters, and hard-break every line (trailing two spaces) so line breaks survive.
function escapeLineStart(line) {
	return line.replace(/^(\s*)([#>*+-]|\d+[.)])/, '$1\\$2');
}

function escapeInline(line) {
	return line.replace(/\\/g, '\\\\').replace(/([*_`[\]])/g, '\\$1');
}

function legacyTextToMarkdown(raw) {
	return raw
		.split('\n')
		.map((line) => escapeLineStart(escapeInline(line)))
		.join('  \n');
}

async function main() {
	const { rows: posts } = await client.execute(
		'select id, text from post order by created_at asc'
	);

	let converted = 0;
	let skipped = 0;

	for (const post of posts) {
		const { rows: existingBlocks } = await client.execute({
			sql: 'select id from post_block where post_id = ? limit 1',
			args: [post.id]
		});
		if (existingBlocks.length > 0) {
			skipped++;
			continue;
		}

		const { rows: photos } = await client.execute({
			sql: 'select id from photo where post_id = ? order by position asc',
			args: [post.id]
		});

		let position = 0;

		if (post.text && post.text.trim() !== '') {
			await client.execute({
				sql: 'insert into post_block (id, post_id, position, type, text) values (?, ?, ?, ?, ?)',
				args: [randomUUID(), post.id, position++, 'text', legacyTextToMarkdown(post.text)]
			});
		}

		if (photos.length > 0) {
			const blockId = randomUUID();
			await client.execute({
				sql: 'insert into post_block (id, post_id, position, type, text) values (?, ?, ?, ?, ?)',
				args: [blockId, post.id, position++, 'photos', null]
			});
			for (const photo of photos) {
				await client.execute({
					sql: 'update photo set block_id = ? where id = ?',
					args: [blockId, photo.id]
				});
			}
		}

		if (position > 0) {
			await client.execute({ sql: 'update post set text = null where id = ?', args: [post.id] });
			converted++;
		}
	}

	console.log(`Backfill done: ${converted} post(s) converted, ${skipped} already had blocks.`);
}

await main();
process.exit(0);
