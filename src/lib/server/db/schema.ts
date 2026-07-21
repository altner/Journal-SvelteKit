import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ---------- Auth ----------

export const user = sqliteTable('user', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(), // random session token
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// ---------- Content ----------

export const album = sqliteTable('album', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	// URL slug, generated once at creation time and never changed again — see generateAlbumSlug
	// in albums.ts. Nullable + unique for the same db:push-safety reason as post.slug.
	slug: text('slug').unique(),
	// The post that originally created this album
	originPostId: text('origin_post_id'),
	authorId: text('author_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const post = sqliteTable('post', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title'), // optional headline, shown where "username" would be in the FB layout
	text: text('text'),
	// URL slug, generated once at creation time (from the title, or the post's own id as fallback
	// when there's no usable title) and never changed again — see generatePostSlug in posts.ts.
	// Nullable + unique, not NOT NULL: SQLite allows multiple NULLs under a UNIQUE index, and a
	// nullable column is the only kind `drizzle-kit push` can ever apply as a lossless ADD COLUMN
	// (see the isStatusPost incident above).
	slug: text('slug').unique(),
	authorId: text('author_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	// set once an album is created from this post's photos
	albumId: text('album_id').references(() => album.id, { onDelete: 'set null' }),
	// true only for auto-generated "photos added" posts (albums/[id] addPhotos action) —
	// those stay deletable but not editable.
	isStatusPost: integer('is_status_post', { mode: 'boolean' }).notNull().default(false),
	// GPS location, all nullable — a post can exist without one. Nullable, no default, so
	// `db:push` can only ever emit a lossless ADD COLUMN for these (see CLAUDE.md: adding
	// isStatusPost, a NOT NULL column even WITH a default, once made drizzle-kit propose
	// wiping the table — nullable columns have no such ambiguity).
	latitude: real('latitude'),
	longitude: real('longitude'),
	locationPlace: text('location_place'), // e.g. "Dresden" — resolved once via Nominatim at write time
	locationCountry: text('location_country'), // e.g. "Deutschland"
	locationName: text('location_name'), // optional POI label, e.g. "Elbwiesen" — user-editable
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const postBlock = sqliteTable('post_block', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	postId: text('post_id')
		.notNull()
		.references(() => post.id, { onDelete: 'cascade' }),
	position: integer('position').notNull(), // order within the post, 0-based
	type: text('type', { enum: ['text', 'photos'] }).notNull(),
	text: text('text') // markdown, only set for type='text'
});

export const photo = sqliteTable('photo', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	filename: text('filename').notNull(), // name on disk, served via /uploads/[filename]
	originalName: text('original_name'),
	postId: text('post_id')
		.notNull()
		.references(() => post.id, { onDelete: 'cascade' }),
	// set only when this photo also belongs to an album; single photos stay null
	// and remain in the general photo stream.
	albumId: text('album_id').references(() => album.id, { onDelete: 'set null' }),
	// which of the post's ordered blocks this photo belongs to.
	blockId: text('block_id').references(() => postBlock.id, { onDelete: 'cascade' }),
	// nullable, no default (like the GPS columns) so `db:push` can only ever emit a lossless
	// ADD COLUMN here — NULL means "not excluded", same as false. Never filter with a plain
	// eq(excludeFromStream, false), always treat NULL as included too.
	excludeFromStream: integer('exclude_from_stream', { mode: 'boolean' }),
	position: integer('position').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const tag = sqliteTable('tag', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	// as-typed casing of whichever occurrence created this tag first — shown everywhere
	name: text('name').notNull(),
	// lowercase, normalized dedup key AND the /tags/[slug] URL segment
	slug: text('slug').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Junction table: a post can have many tags, a tag can be on many posts.
export const postTag = sqliteTable(
	'post_tag',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		postId: text('post_id')
			.notNull()
			.references(() => post.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [unique('post_tag_post_id_tag_id_unique').on(t.postId, t.tagId)]
);

// ---------- Relations ----------

export const userRelations = relations(user, ({ many }) => ({
	posts: many(post),
	albums: many(album)
}));

export const postRelations = relations(post, ({ one, many }) => ({
	author: one(user, { fields: [post.authorId], references: [user.id] }),
	album: one(album, { fields: [post.albumId], references: [album.id] }),
	photos: many(photo),
	blocks: many(postBlock),
	tags: many(postTag)
}));

export const postBlockRelations = relations(postBlock, ({ one, many }) => ({
	post: one(post, { fields: [postBlock.postId], references: [post.id] }),
	photos: many(photo)
}));

export const albumRelations = relations(album, ({ one, many }) => ({
	author: one(user, { fields: [album.authorId], references: [user.id] }),
	photos: many(photo)
}));

export const photoRelations = relations(photo, ({ one }) => ({
	post: one(post, { fields: [photo.postId], references: [post.id] }),
	album: one(album, { fields: [photo.albumId], references: [album.id] }),
	block: one(postBlock, { fields: [photo.blockId], references: [postBlock.id] })
}));

export const tagRelations = relations(tag, ({ many }) => ({
	posts: many(postTag)
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
	post: one(post, { fields: [postTag.postId], references: [post.id] }),
	tag: one(tag, { fields: [postTag.tagId], references: [tag.id] })
}));
