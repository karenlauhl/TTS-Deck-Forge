import type { AnyTemplate } from './types';

const templates = new Map<string, AnyTemplate>();

export function registerTemplate(template: AnyTemplate): void {
  if (templates.has(template.id)) throw new Error(`Template "${template.id}" is already registered`);
  if (template.kinds.length === 0) throw new Error(`Template "${template.id}" declares no card kinds`);
  templates.set(template.id, template);
}

export function getTemplate(id: string): AnyTemplate {
  const t = templates.get(id);
  if (!t) throw new Error(`Unknown card template "${id}"`);
  return t;
}

export function hasTemplate(id: string): boolean {
  return templates.has(id);
}

export function listTemplates(): AnyTemplate[] {
  return [...templates.values()];
}

/** Test helper. */
export function clearTemplates(): void {
  templates.clear();
}
