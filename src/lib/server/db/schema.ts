import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
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
	authorId: text('author_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	// set once an album is created from this post's photos
	albumId: text('album_id').references(() => album.id, { onDelete: 'set null' }),
	// true only for auto-generated "photos added" posts (albums/[id] addPhotos action) —
	// those stay deletable but not editable.
	isStatusPost: integer('is_status_post', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
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
	tags: many(postTag)
}));

export const albumRelations = relations(album, ({ one, many }) => ({
	author: one(user, { fields: [album.authorId], references: [user.id] }),
	photos: many(photo)
}));

export const photoRelations = relations(photo, ({ one }) => ({
	post: one(post, { fields: [photo.postId], references: [post.id] }),
	album: one(album, { fields: [photo.albumId], references: [album.id] })
}));

export const tagRelations = relations(tag, ({ many }) => ({
	posts: many(postTag)
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
	post: one(post, { fields: [postTag.postId], references: [post.id] }),
	tag: one(tag, { fields: [postTag.tagId], references: [tag.id] })
}));
