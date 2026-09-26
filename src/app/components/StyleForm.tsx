import { useId, useRef, useState } from 'react';
import type { Asset, AssetId } from '../../core/model/deck';
import { getPath } from '../../core/template/paths';
import type { AnyTemplate, StyleOptionDef } from '../../core/template/types';
import { fileToAsset, FONT_ACCEPT, IMAGE_ACCEPT } from '../assets';
import { useWorkspace } from '../state/WorkspaceContext';

/** Form generated from the template's declarative style options. */
export function StyleForm({ template }: { template: AnyTemplate }) {
  const { ws, dispatch } = useWorkspace();
  const style = ws.deck.style;
  const values = (style.values ?? {}) as Record<string, unknown>;
  const custom = style.mode === 'custom';
  const [err, setErr] = useState<string | null>(null);

  const set = (key: string, value: unknown) => dispatch({ type: 'setStyleValue', key, value });

  const visible = template.styleOptions.filter((o) => (custom || !o.customOnly) && (!o.visibleWhen || o.visibleWhen(values)));
  const groups = [...new Set(visible.map((o) => o.group ?? 'Options'))];
  const hasCustom = template.styleOptions.some((o) => o.customOnly);

  return (
    <div className="style-form">
      {hasCustom && (
        <fieldset className="mode-toggle">
          <legend>Style</legend>
          <label className="check">
            <input type="radio" name="style-mode" checked={!custom} onChange={() => dispatch({ type: 'setStyleMode', mode: 'default' })} />
            Default
          </label>
          <label className="check">
            <input type="radio" name="style-mode" checked={custom} onChange={() => dispatch({ type: 'setStyleMode', mode: 'custom' })} />
            Custom
          </label>
          <p className="muted small">Switching back to Default keeps your custom settings for later.</p>
        </fieldset>
      )}
      {err && (
        <p className="notice error" role="alert">
          {err}
        </p>
      )}
      {groups.map((g) => (
        <fieldset key={g} className="option-group">
          <legend>{g}</legend>
          {visible
            .filter((o) => (o.group ?? 'Options') === g)
            .map((o) => (
              <Option key={o.key} option={o} value={getPath(values, o.key)} onChange={(v) => set(o.key, v)} assets={ws.assets} onError={setErr} />
            ))}
        </fieldset>
      ))}
      {custom && (
        <button
          type="button"
          className="btn small ghost"
          onClick={() => confirm('Reset all custom style settings?') && dispatch({ type: 'setStyle', style: { mode: 'custom', values: structuredClone(template.defaultStyle) } })}
        >
          Reset custom style
        </button>
      )}
    </div>
  );
}

interface OptionProps {
  option: StyleOptionDef;
  value: unknown;
  onChange: (v: unknown) => void;
  assets: ReadonlyMap<AssetId, Asset>;
  onError: (msg: string | null) => void;
}

function Option({ option: o, value, onChange, assets, onError }: OptionProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const help = o.help ? (
    <span id={helpId} className="muted small help">
      {o.help}
    </span>
  ) : null;
  const described = o.help ? helpId : undefined;

  switch (o.type) {
    case 'color':
      return (
        <div className="option color">
          <input id={id} type="color" value={typeof value === 'string' ? toHex(value) : '#000000'} onChange={(e) => onChange(e.target.value)} aria-describedby={described} />
          <label htmlFor={id}>{o.label}</label>
          {help}
        </div>
      );
    case 'boolean':
      return (
        <div className="option">
          <label className="check">
            <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-describedby={described} /> {o.label}
          </label>
          {help}
        </div>
      );
    case 'select':
      return (
        <div className="option stack">
          <label htmlFor={id}>{o.label}</label>
          <select id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} aria-describedby={described}>
            {o.options.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
          {help}
        </div>
      );
    case 'number':
      return (
        <div className="option stack">
          <label htmlFor={id}>
            {o.label}
            {o.unit ? ` (${o.unit})` : ''}
          </label>
          <input
            id={id}
            type="number"
            min={o.min}
            max={o.max}
            step={o.step ?? 1}
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== '' && Number.isFinite(n)) onChange(Math.min(o.max, Math.max(o.min, n)));
            }}
            aria-describedby={described}
          />
          {help}
        </div>
      );
    case 'text':
      return (
        <div className="option stack">
          <label htmlFor={id}>{o.label}</label>
          <input id={id} type="text" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} aria-describedby={described} />
          {help}
        </div>
      );
    case 'font':
    case 'image':
      return <AssetOption id={id} option={o} value={value} onChange={onChange} assets={assets} onError={onError} help={help} described={described} />;
  }
}

function AssetOption({
  id,
  option: o,
  value,
  onChange,
  assets,
  onError,
  help,
  described,
}: OptionProps & { id: string; help: React.ReactNode; described?: string }) {
  const { dispatch } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const role = o.type === 'font' ? 'font' : 'image';
  const current = typeof value === 'string' ? assets.get(value) : undefined;
  const [thumb] = useState(() => new Map<string, string>());
  const thumbUrl = current && role === 'image' ? (thumb.get(current.id) ?? thumb.set(current.id, URL.createObjectURL(current.blob)).get(current.id)) : undefined;

  const upload = async (file: File) => {
    setBusy(true);
    onError(null);
    try {
      const asset = await fileToAsset(file, role);
      dispatch({ type: 'addAssets', assets: [asset] });
      onChange(asset.id);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="option asset">
      <span className="asset-label" id={`${id}-label`}>
        {o.label}
      </span>
      <div className="asset-row">
        {thumbUrl && <img src={thumbUrl} alt="" className="asset-thumb" />}
        <span className="muted small">{current ? current.name : role === 'font' ? 'Default (Inter)' : 'None'}</span>
        <button type="button" className="btn small" onClick={() => input.current?.click()} disabled={busy} aria-describedby={`${id}-label ${described ?? ''}`}>
          {busy ? 'Loading…' : current ? 'Replace…' : 'Upload…'}
        </button>
        {current && (
          <button type="button" className="btn small ghost" onClick={() => onChange(null)} aria-describedby={`${id}-label`}>
            Remove
          </button>
        )}
        <input
          ref={input}
          type="file"
          hidden
          accept={role === 'font' ? FONT_ACCEPT : IMAGE_ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) upload(f);
          }}
        />
      </div>
      {help}
    </div>
  );
}

/** input[type=color] needs #rrggbb. */
function toHex(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}` : '#000000';
}
