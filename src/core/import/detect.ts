export type ImportFormat = 'txt' | 'csv' | 'xlsx' | 'json';

export const ACCEPTED_EXTENSIONS = ['.txt', '.csv', '.xlsx', '.json'] as const;

export function detectFormat(fileName: string): ImportFormat | null {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  switch (ext) {
    case 'txt':
    case 'csv':
    case 'xlsx':
    case 'json':
      return ext;
    default:
      return null;
  }
}

/** Decode bytes as UTF-8 and drop a leading BOM (Excel adds one to CSVs). */
export function decodeText(bytes: ArrayBuffer | Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');
}
