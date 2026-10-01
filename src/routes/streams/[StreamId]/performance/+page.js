import { streams } from '$lib/data/streams';

export function entries() {
  // Loop through your data and return an object for every stream
  // We wrap it in String() just in case your IDs are stored as numbers
  return streams.map(stream => {
    return { StreamId: String(stream.usgs_id) };
  });
}
