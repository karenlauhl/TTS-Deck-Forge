import JSZip from 'jszip';

export interface ZipEntry {
  path: string;
  data: Blob | Uint8Array | string;
}

export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const e of entries) {
    // Images are already compressed; don't waste time deflating them again.
    const isImage = /\.(png|jpe?g)$/i.test(e.path);
    zip.file(e.path, e.data, { compression: isImage ? 'STORE' : 'DEFLATE' });
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}
