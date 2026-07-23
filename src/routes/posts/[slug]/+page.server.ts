import type { PageServerLoad, Actions } from './$types';
import { postDetailLoad, postDetailActions } from '$lib/server/postDetail';

export const load: PageServerLoad = postDetailLoad;
export const actions: Actions = postDetailActions;
