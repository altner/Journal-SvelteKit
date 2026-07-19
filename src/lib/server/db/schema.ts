import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
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

// ---------- Relations ----------

export const userRelations = relations(user, ({ many }) => ({
	posts: many(post),
	albums: many(album)
}));

export const postRelations = relations(post, ({ one, many }) => ({
	author: one(user, { fields: [post.authorId], references: [user.id] }),
	album: one(album, { fields: [post.albumId], references: [album.id] }),
	photos: many(photo)
}));

export const albumRelations = relations(album, ({ one, many }) => ({
	author: one(user, { fields: [album.authorId], references: [user.id] }),
	photos: many(photo)
}));

export const photoRelations = relations(photo, ({ one }) => ({
	post: one(post, { fields: [photo.postId], references: [post.id] }),
	album: one(album, { fields: [photo.albumId], references: [album.id] })
}));
