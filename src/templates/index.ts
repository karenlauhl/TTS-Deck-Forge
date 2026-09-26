import { hasTemplate, registerTemplate, type AnyTemplate } from '../core/template';

// Every folder in src/templates with an index.ts exporting `template` is a card template.
// Adding a template = adding a folder. Nothing else changes.
const modules = import.meta.glob<{ template?: AnyTemplate }>('./*/index.ts', { eager: true });

for (const [path, mod] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
  if (!mod.template) throw new Error(`${path} must export a \`template\``);
  if (!hasTemplate(mod.template.id)) registerTemplate(mod.template);
}

export { getTemplate, listTemplates } from '../core/template';
