import { buildSampleFile, sampleFormats } from '../../core/import/samples';
import type { AnyTemplate } from '../../core/template/types';
import { downloadBlob } from '../download';

export function SampleDownloads({ template }: { template: AnyTemplate }) {
  const formats = sampleFormats(template);
  if (formats.length === 0) return null;
  return (
    <div className="sample-downloads">
      <span className="muted small">Template files:</span>
      {formats.map((f) => (
        <button
          key={f}
          type="button"
          className="btn small"
          onClick={() => {
            const s = buildSampleFile(template, f);
            downloadBlob(new Blob([s.data as BlobPart], { type: s.mime }), s.fileName);
          }}
        >
          .{f}
        </button>
      ))}
    </div>
  );
}
