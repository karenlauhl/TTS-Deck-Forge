/** Short random id with a prefix, e.g. `c_k3j29x0a`. Not cryptographic; only needs to be unique in a deck. */
export function randomId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += (b % 36).toString(36);
  return `${prefix}_${out}`;
}

export const newCardId = (): string => randomId('c');

/** Content-addressed asset id: identical uploads share one id. */
export async function assetIdFor(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest).slice(0, 10), (b) => b.toString(16).padStart(2, '0')).join('');
  return `a_${hex}`;
}
