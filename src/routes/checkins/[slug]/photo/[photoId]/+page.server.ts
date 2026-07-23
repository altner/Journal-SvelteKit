import type { PageServerLoad } from './$types';
import { checkinPhotoLoad } from '$lib/server/checkinDetail';

export const load: PageServerLoad = checkinPhotoLoad;
