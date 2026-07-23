import type { PageServerLoad } from './$types';
import { createPostPhotoLoad } from '$lib/server/postDetail';

export const load: PageServerLoad = createPostPhotoLoad('/checkins');
