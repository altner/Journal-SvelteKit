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
	// optional free-text description, set once at album-creation time (no separate edit flow yet)
	description: text('description'),
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
	// true only for posts created via the Micropub checkin endpoint (routes/api/micropub).
	// Nullable, no default (like excludeFromStream/the GPS columns below) so `db:push` can only
	// ever emit a lossless ADD COLUMN here — NULL means "not a checkin", same as false.
	isCheckin: integer('is_checkin', { mode: 'boolean' }),
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
	width: integer('width'),
	height: integer('height'),
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

export const activity = sqliteTable('activity', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	// URL slug, generated once at creation (from title, or the activity's own id as fallback) —
	// same scheme as post.slug/album.slug, see generateActivitySlug in activities.ts.
	slug: text('slug').unique(),
	// Always populated at insert time (user input, or an auto-generated fallback like "Lauf am
	// 21.07.2026" derived from sport+startedAt) — follows album.title's convention (always set),
	// not post.title's (genuinely optional). NOT NULL is safe here since this is a brand-new,
	// empty table (the db:push ALTER-TABLE danger from CLAUDE.md only applies to adding a NOT
	// NULL column to an already-populated table, not to CREATE TABLE).
	title: text('title').notNull(),
	sport: text('sport', { enum: ['running', 'cycling', 'hiking', 'walking', 'other'] }).notNull(),
	// Computed from the full-resolution parsed GPX track at insert time (haversine sum), never
	// from trackPoints below (that's only the downsampled map rendering).
	distanceMeters: real('distance_meters').notNull(),
	// Elapsed time: last trkpt timestamp minus first, across all segments/tracks concatenated —
	// includes any auto-pause gaps, this is elapsed time, not moving time.
	durationSeconds: integer('duration_seconds').notNull(),
	// Sum of positive elevation deltas between consecutive points. NULL when any point in the
	// track is missing <ele> — a partial sum across a data gap would be silently wrong, so
	// "unknown" means fully unknown, not best-effort.
	elevationGainMeters: real('elevation_gain_meters'),
	startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
	// Server-generated name for the raw stored track file on disk (e.g. "<uuid>.gpx"), mirrors
	// photo.filename. The extension drives both MIME lookup (uploads/[filename]/+server.ts) and
	// future format dispatch (parseGpxTrack today, parseFitTrack later keyed off the same
	// extension) — no separate sourceFormat column needed.
	filename: text('filename').notNull(),
	originalName: text('original_name'),
	// JSON-stringified, downsampled [[lat, lng], ...] array (capped ~500 points, even-interval
	// sampling preserving first+last exactly) — read-only map rendering only, never re-parsed
	// for stats.
	trackPoints: text('track_points').notNull(),
	// Historical weather at the track's start point + startedAt, fetched best-effort from
	// Open-Meteo's archive API (see lib/server/weather.ts) — all four nullable together, no
	// default: unset until the fetch succeeds (fresh upload where Open-Meteo's ~5-day reanalysis
	// delay hasn't caught up yet, an API hiccup, or an activity created before this feature
	// existed and not yet backfilled via scripts/backfill-weather.mjs).
	weatherTempC: real('weather_temp_c'),
	weatherCode: integer('weather_code'), // WMO weather interpretation code, see lib/weather.ts
	weatherWindKph: real('weather_wind_kph'),
	weatherPrecipitationMm: real('weather_precipitation_mm'),
	authorId: text('author_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const activityPhoto = sqliteTable('activity_photo', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	activityId: text('activity_id')
		.notNull()
		.references(() => activity.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	originalName: text('original_name'),
	width: integer('width'),
	height: integer('height'),
	position: integer('position').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Junction table: an activity can have many tags, a tag can be on many activities — mirrors
// postTag exactly (a dedicated table per entity, not a polymorphic one, matching this project's
// existing convention).
export const activityTag = sqliteTable(
	'activity_tag',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		activityId: text('activity_id')
			.notNull()
			.references(() => activity.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [unique('activity_tag_activity_id_tag_id_unique').on(t.activityId, t.tagId)]
);

// ---------- Relations ----------

export const userRelations = relations(user, ({ many }) => ({
	posts: many(post),
	albums: many(album),
	activities: many(activity)
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
	posts: many(postTag),
	activities: many(activityTag)
}));

export const activityRelations = relations(activity, ({ one, many }) => ({
	author: one(user, { fields: [activity.authorId], references: [user.id] }),
	tags: many(activityTag),
	photos: many(activityPhoto)
}));

export const activityPhotoRelations = relations(activityPhoto, ({ one }) => ({
	activity: one(activity, { fields: [activityPhoto.activityId], references: [activity.id] })
}));

export const activityTagRelations = relations(activityTag, ({ one }) => ({
	activity: one(activity, { fields: [activityTag.activityId], references: [activity.id] }),
	tag: one(tag, { fields: [activityTag.tagId], references: [tag.id] })
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
	post: one(post, { fields: [postTag.postId], references: [post.id] }),
	tag: one(tag, { fields: [postTag.tagId], references: [tag.id] })
}));
