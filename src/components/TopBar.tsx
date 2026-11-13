import { useEffect, useRef, useState } from 'preact/hooks';
import { route, openSyllable, type Page } from '../lib/router';
import { filtersActive, filtersOpen, resolveExample, setSetting, settings, type Settings } from '../lib/store';
import { search, loadCharIndex, type SearchHit } from '../lib/search';
import { toneMark } from '../lib/pinyin';
import { Search as SearchIcon, FiltersIcon, Flip, More, Density, Sun, Moon, Monitor, Eye, EyeOff, Check, ChartIcon, FinalsIcon, InitialsIcon, LearnIcon, Database } from './icons';

interface NavItem {
  page: Page;
  label: string;
  href: string;
  /** A short second line that says what the page is for. */
  sub?: string;
}
/** The main navigation on wide screens. */
const PAGES: NavItem[] = [
  { page: 'chart', label: 'Chart', href: '#/' },
  { page: 'finals', label: 'Finals', href: '#/finals' },
  { page: 'initials', label: 'Initials', href: '#/initials' },
  { page: 'browse', label: 'Browse', href: '#/browse' },
  { page: 'learn', label: 'Learn', href: '#/learn' },
  { page: 'data', label: 'My data', href: '#/data', sub: 'backup' },
];
/** In the More menu on every screen. */
const MORE: NavItem[] = [
  { page: 'settings', label: 'Settings', href: '#/settings' },
  { page: 'about', label: 'About', href: '#/about' },
];
/** On phones the tab bar holds five destinations; the rest of the main navigation moves into the More menu. */
const TABS: (NavItem & { icon: typeof ChartIcon })[] = [
  { page: 'chart', label: 'Chart', href: '#/', icon: ChartIcon },
  { page: 'finals', label: 'Finals', href: '#/finals', icon: FinalsIcon },
  { page: 'initials', label: 'Initials', href: '#/initials', icon: InitialsIcon },
  { page: 'learn', label: 'Learn', href: '#/learn', icon: LearnIcon },
  { page: 'data', label: 'My data', href: '#/data', icon: Database, sub: 'backup and restore' },
];

/** Bottom tab bar, phones only (hidden by CSS on wide screens). */
export function TabBar() {
  const page = route.value.page;
  const tabs = TABS;
  return (
    <nav class="tabbar" aria-label="Sections" style={{ '--tabs': tabs.length }}>
      {tabs.map((t) => (
        <a href={t.href} aria-current={page === t.page ? 'page' : undefined} aria-label={t.sub ? `${t.label}: ${t.sub}` : undefined}>
          <t.icon size={20} aria-hidden="true" />
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}

function hitLabel(h: SearchHit) {
  const cell = h.tone ? h.syllable.tones.find((t) => t.tone === h.tone) : undefined;
  const ex = cell ? resolveExample(cell.numeric) : undefined;
  // A character found through the wider index is not the cell's own example, so its gloss would be the wrong one.
  const own = !h.via || h.via === ex?.character;
  return {
    py: h.tone ? toneMark(h.syllable.id, h.tone) : h.syllable.id,
    han: h.via ?? ex?.character ?? '',
    gloss: own ? (ex?.meaning ?? '') : ex?.character ? `example: ${ex.character}` : '',
  };
}

function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [, setIndexReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = open ? search(q) : [];

  // "/" focuses the search box from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (h: SearchHit) => {
    openSyllable(h.syllable.id, h.tone);
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
  };

  return (
    <div class="search" role="search">
      <SearchIcon size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        placeholder="zhi, zhī, zhi1 or 知"
        aria-label="Search by pinyin or character"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        enterkeyhint="go"
        aria-autocomplete="list"
        aria-controls="search-results"
        onFocus={(e) => {
          setOpen(true);
          (e.target as HTMLInputElement).select();
          // The character index is only needed once someone searches.
          void loadCharIndex().then(() => setIndexReady(true));
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onInput={(e) => {
          setQ((e.target as HTMLInputElement).value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && hits[active]) {
            e.preventDefault();
            go(hits[active]);
          } else if (e.key === 'Escape') {
            e.preventDefault(); // so the same key press does not also close the detail panel
            setOpen(false);
            setQ('');
            inputRef.current?.blur();
          }
        }}
      />
      {open && q.trim() !== '' && (
        <ul class="search-results" id="search-results" role="listbox">
          {hits.length === 0 && <li class="none">No syllable or character matches “{q.trim()}”.</li>}
          {hits.map((h, i) => {
            const l = hitLabel(h);
            return (
              <li key={`${h.syllable.id}-${h.tone}-${h.via}`}>
                <button type="button" role="option" aria-selected={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => go(h)}>
                  <span class="py">{l.py}</span>
                  {l.han && <span class="han">{l.han}</span>}
                  <span class="gloss">{l.gloss}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const DENSITY_LABEL: Record<Settings['density'], string> = { auto: 'Automatic', compact: 'One character', full: 'Every tone' };
const THEME_LABEL: Record<Settings['theme'], string> = { system: 'System', light: 'Light', dark: 'Dark' };
const next = <T,>(list: T[], current: T): T => list[(list.indexOf(current) + 1) % list.length];

function Menu({ onClose }: { onClose: () => void }) {
  const s = settings.value;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: Event) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-menu-button]')) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  const ThemeIcon = s.theme === 'dark' ? Moon : s.theme === 'light' ? Sun : Monitor;
  // On phones: whatever of the main navigation is not in the tab bar.
  const inTabs = new Set(TABS.map((t) => t.page));
  const overflow = PAGES.filter((p) => !inTabs.has(p.page));
  return (
    <div class="menu" ref={ref} role="menu" aria-label="More">
      <div class="pages">
        {overflow.map((p) => (
          <a class="menu-item" role="menuitem" href={p.href} onClick={onClose}>
            {p.label}
            {route.value.page === p.page && <Check size={16} class="state" aria-label="current page" />}
          </a>
        ))}
      </div>
      {MORE.map((p) => (
        <a class="menu-item" role="menuitem" href={p.href} onClick={onClose}>
          {p.label}
          {route.value.page === p.page && <Check size={16} class="state" aria-label="current page" />}
        </a>
      ))}
      <hr />
      <button type="button" class="menu-item" role="menuitem" onClick={() => setSetting('density', next(['auto', 'compact', 'full'], s.density))}>
        <Density size={17} aria-hidden="true" />
        Detail in each square
        <span class="state">{DENSITY_LABEL[s.density]}</span>
      </button>
      <button type="button" class="menu-item" role="menuitemcheckbox" aria-checked={s.heatmap} onClick={() => setSetting('heatmap', !s.heatmap)}>
        {s.heatmap ? <Eye size={17} aria-hidden="true" /> : <EyeOff size={17} aria-hidden="true" />}
        Colour by status
        <span class="state">{s.heatmap ? 'On' : 'Off'}</span>
      </button>
      <button
        type="button"
        class="menu-item"
        role="menuitemcheckbox"
        aria-checked={s.showUnverified}
        onClick={() => setSetting('showUnverified', !s.showUnverified)}
      >
        {s.showUnverified ? <Eye size={17} aria-hidden="true" /> : <EyeOff size={17} aria-hidden="true" />}
        Rare syllables
        <span class="state">{s.showUnverified ? 'Shown' : 'Hidden'}</span>
      </button>
      <button type="button" class="menu-item" role="menuitem" onClick={() => setSetting('theme', next(['system', 'light', 'dark'], s.theme))}>
        <ThemeIcon size={17} aria-hidden="true" />
        Appearance
        <span class="state">{THEME_LABEL[s.theme]}</span>
      </button>
    </div>
  );
}

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const page = route.value.page;
  const active = filtersActive.value;
  return (
    <header class="topbar">
      <a class="wordmark" href="#/" aria-label="Pinyin Chart, home">
        <span class="han" aria-hidden="true">
          拼音
        </span>
        <span class="name">Pinyin Chart</span>
      </a>
      <nav class="nav" aria-label="Pages">
        {PAGES.map((p) => (
          <a href={p.href} aria-current={page === p.page ? 'page' : undefined} aria-label={p.sub ? `${p.label}: ${p.sub}` : undefined} class={p.sub ? 'has-sub' : undefined}>
            <span>{p.label}</span>
            {p.sub && <small aria-hidden="true">{p.sub}</small>}
          </a>
        ))}
      </nav>
      <SearchBox />
      {page === 'chart' && (
        <>
          <button
            type="button"
            class={`icon-btn${filtersOpen.value ? ' on' : ''}`}
            aria-label={`Filters${active ? `, ${active} active` : ''}`}
            aria-expanded={filtersOpen.value}
            title="Filters"
            onClick={() => (filtersOpen.value = !filtersOpen.value)}
          >
            <FiltersIcon size={19} aria-hidden="true" />
            {active > 0 && <span class="badge">{active}</span>}
          </button>
          <button
            type="button"
            class={`icon-btn${settings.value.flipAxes ? ' on' : ''}`}
            aria-label="Flip the axes"
            aria-pressed={settings.value.flipAxes}
            title="Flip the axes"
            onClick={() => setSetting('flipAxes', !settings.value.flipAxes)}
          >
            <Flip size={19} aria-hidden="true" />
          </button>
        </>
      )}
      <button
        type="button"
        class="icon-btn"
        data-menu-button
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="More"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <More size={20} aria-hidden="true" />
      </button>
      {menuOpen && <Menu onClose={() => setMenuOpen(false)} />}
    </header>
  );
}
