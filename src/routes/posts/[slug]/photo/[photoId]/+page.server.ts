import type { PageServerLoad } from './$types';
import { postPhotoLoad } from '$lib/server/postDetail';

export const load: PageServerLoad = postPhotoLoad;
