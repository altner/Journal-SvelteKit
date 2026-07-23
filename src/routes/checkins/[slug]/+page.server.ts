import type { PageServerLoad, Actions } from './$types';
import { checkinDetailLoad, checkinDetailActions } from '$lib/server/checkinDetail';

export const load: PageServerLoad = checkinDetailLoad;
export const actions: Actions = checkinDetailActions;
