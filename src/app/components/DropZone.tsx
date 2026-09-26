import { useId, useRef, useState, type ReactNode } from 'react';

interface Props {
  accept: string;
  onFiles: (files: File[]) => void;
  label: string;
  hint?: ReactNode;
  busy?: boolean;
}

/** Drag-and-drop area that is also a keyboard-usable file button. */
export function DropZone({ accept, onFiles, label, hint, busy }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const hintId = useId();

  return (
    <div
      className={`dropzone${over ? ' over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files];
        if (files.length) onFiles(files);
      }}
    >
      <p className="dropzone-title">Drop files here</p>
      <button type="button" className="btn" onClick={() => input.current?.click()} aria-describedby={hintId} disabled={busy}>
        {busy ? 'Reading…' : label}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {hint && (
        <p id={hintId} className="muted small">
          {hint}
        </p>
      )}
    </div>
  );
}
