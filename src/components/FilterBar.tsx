import { FINAL_GROUPS } from '../data/finals';
import { TAGS } from '../data/tags';
import { EMPTY_FILTERS, filters, filtersActive, filtersOpen, matches, toggleFilter, visibleSyllableCount, type Filters } from '../lib/store';
import { useBackLayer } from '../lib/back';

function Chips<K extends 'statuses' | 'groups' | 'types' | 'difficulties' | 'tags'>({
  label,
  field,
  options,
}: {
  label: string;
  field: K;
  options: { value: Filters[K][number]; label: string; swatch?: string; title?: string }[];
}) {
  const current = filters.value[field] as string[];
  return (
    <div class="filter-group" role="group" aria-label={label}>
      <span class="label">{label}</span>
      <div class="opts">
        {options.map((o) => (
          <button type="button" class="chip" aria-pressed={current.includes(o.value)} title={o.title} onClick={() => toggleFilter(field, o.value)}>
            {o.swatch && <i class={`swatch ${o.swatch}`} aria-hidden="true" />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const TAG_OPTIONS = TAGS.filter((t) => t.kind === 'spelling' || t.kind === 'initial' || t.kind === 'other' || t.id.endsWith('-nasal')).filter(
  (t) => t.id !== 'null-initial',
);

export function FilterBar() {
  // The system back button (Android) closes the panel before the page underneath.
  useBackLayer(true, () => (filtersOpen.value = false));
  const f = filters.value;
  const count = Object.keys(matches.value).length;
  const total = visibleSyllableCount.value;
  return (
    <section class="filters" aria-label="Filters">
      <Chips
        label="Status"
        field="statuses"
        options={[
          { value: 'new', label: 'New', swatch: 's-new' },
          { value: 'shaky', label: 'Shaky', swatch: 's-shaky' },
          { value: 'solid', label: 'Solid', swatch: 's-solid' },
        ]}
      />
      <div class="filter-group" role="group" aria-label="Recordings">
        <span class="label">Recordings</span>
        <div class="opts">
          <button type="button" class="chip" aria-pressed={f.hasRecording} onClick={() => (filters.value = { ...f, hasRecording: !f.hasRecording })}>
            Has a recording
          </button>
        </div>
      </div>
      <Chips label="Final group" field="groups" options={FINAL_GROUPS.map((g) => ({ value: g.id, label: g.id }))} />
      <Chips
        label="Final type"
        field="types"
        options={[
          { value: 'simple', label: 'Simple' },
          { value: 'compound', label: 'Compound' },
          { value: 'nasal', label: 'Nasal' },
        ]}
      />
      <Chips
        label="Initial difficulty"
        field="difficulties"
        options={[
          { value: 'easy', label: 'Easy', title: 'm f n l s' },
          { value: 'tougher', label: 'Tougher', title: 'b d g, p t k, h' },
          { value: 'problem', label: 'Problem', title: 'j q x, zh ch sh r, z c' },
        ]}
      />
      <Chips label="Spelling and sound" field="tags" options={TAG_OPTIONS.map((t) => ({ value: t.id, label: t.label, title: t.explain }))} />
      <div class="filter-summary" aria-live="polite">
        <span>
          {filtersActive.value ? `${count} of ${total} syllables match` : `${total} syllables`}
        </span>
        <button type="button" class="btn quiet" disabled={!filtersActive.value} onClick={() => (filters.value = { ...EMPTY_FILTERS })}>
          Clear filters
        </button>
      </div>
    </section>
  );
}
