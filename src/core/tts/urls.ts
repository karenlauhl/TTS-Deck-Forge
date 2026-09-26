export type UrlCheck = { level: 'ok' | 'warn' | 'error'; message: string };

/** Hosts that serve images without a file extension (TTS Cloud Manager / Steam Cloud). */
export const STEAM_CLOUD_HOSTS = ['steamusercontent-a.akamaihd.net', 'steamuserimages-a.akamaihd.net', 'cloud-3.steamusercontent.com'];

const IMAGE_EXT = /\.(png|jpe?g)$/i;

/**
 * Does this look like a direct image link TTS can load?
 * Warnings don't block; errors do.
 */
export function checkImageUrl(raw: string, opts: { allowLocal?: boolean } = {}): UrlCheck {
  const value = raw.trim();
  if (!value) return { level: 'error', message: 'Required.' };

  if (/^file:\/\//i.test(value)) {
    return opts.allowLocal
      ? { level: 'warn', message: 'Local file: only you will see this image. Other players will see blank cards.' }
      : { level: 'error', message: 'Local files only work in local test mode.' };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { level: 'error', message: 'Not a valid URL. It should start with https://' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { level: 'error', message: 'Use an http:// or https:// link.' };

  const host = url.hostname.toLowerCase();
  if (STEAM_CLOUD_HOSTS.includes(host)) return { level: 'ok', message: 'Steam Cloud link.' };

  if (host === 'imgur.com' || host === 'www.imgur.com') {
    return { level: 'warn', message: 'This is an Imgur page, not the image. Right-click the image and copy its address (i.imgur.com/….png).' };
  }
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    return { level: 'warn', message: 'Google Drive links open a viewer page, not the image, and usually fail in TTS. Use Steam Cloud instead.' };
  }
  if (host.endsWith('dropbox.com') && url.searchParams.get('dl') !== '1' && url.searchParams.get('raw') !== '1') {
    return { level: 'warn', message: 'Dropbox links need ?dl=1 (or raw=1) at the end to serve the image directly.' };
  }
  if (!IMAGE_EXT.test(url.pathname)) {
    return { level: 'warn', message: "Doesn't end in .png or .jpg, so it may be a web page rather than the image itself." };
  }
  return { level: 'ok', message: 'Looks like a direct image link.' };
}
