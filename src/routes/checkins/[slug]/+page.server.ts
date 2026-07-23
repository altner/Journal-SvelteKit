import type { PageServerLoad, Actions } from './$types';
import { createPostDetailLoad, postDetailActions } from '$lib/server/postDetail';

export const load: PageServerLoad = createPostDetailLoad('/checkins');
export const actions: Actions = postDetailActions;
