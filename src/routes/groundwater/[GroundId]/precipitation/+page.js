import { wells } from '$lib/data/streams';

export function entries() {
    return wells.map(w => ({ GroundId: w.storageId }));
}