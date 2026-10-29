// Illustrated portraits for the FAKE sitters. Generated locally from a seed with
// DiceBear's "Lorelei" style (CC0 1.0 by Lisa Wischofsky), so every sitter gets a
// stable face that belongs to no real person, and no network request is needed.

import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";

/** Soft backgrounds behind the portrait, picked by DiceBear from the seed. */
const BACKGROUNDS = ["dbeafe", "dcfce7", "fef3c7", "fce7f3", "ede9fe", "ccfbf1"];

const cache = new Map<string, string>();

/** A data: URI for an <img>. Same sitter → same face, every time. */
export function avatarDataUri(id: number, name: string): string {
  const seed = `${id}-${name}`;
  let uri = cache.get(seed);
  if (uri === undefined) {
    uri = createAvatar(lorelei, { seed, backgroundColor: BACKGROUNDS }).toDataUri();
    cache.set(seed, uri);
  }
  return uri;
}
