import { useState } from 'preact/hooks';
import { ACCENTS, CJK_FACES, PRESETS, TEXT_SIZES, TYPEFACES } from '../data/themes';
import { setSetting, settings, type Settings } from '../lib/store';
import { AA_TEXT, contrast, parseHex } from '../lib/contrast';
import { resolveAppearance } from '../lib/theme';
import { Check } from './icons';

function Seg<K extends keyof Settings>({ name, options, label }: { name: K; options: { value: Settings[K]; label: string; hint?: string }[]; label: string }) {
  const s = settings.value;
  return (
    <div class="set-row">
      <span class="set-label" id={`set-${String(name)}`}>
        {label}
      </span>
      <div class="seg" role="radiogroup" aria-labelledby={`set-${String(name)}`}>
        {options.map((o) => (
          <button type="button" role="radio" aria-checked={s[name] === o.value} title={o.hint} onClick={() => setSetting(name, o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ name, label, hint }: { name: keyof Settings; label: string; hint?: string }) {
  const on = !!settings.value[name];
  return (
    <div class="set-row">
      <span class="set-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <button type="button" class={`switch${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => setSetting(name, !on as never)}>
        <i />
        <span>{on ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

function CustomAccent() {
  const s = settings.value;
  const [text, setText] = useState(s.customAccent);
  const valid = parseHex(text) && /^#?[0-9a-f]{6}$/i.test(text.trim());
  const hex = valid ? (text.trim().startsWith('#') ? text.trim() : `#${text.trim()}`) : s.customAccent;
  const resolved = resolveAppearance({ ...s, accent: 'custom', customAccent: hex });
  const used = resolved.vars['--accent'];
  const paper = resolved.vars['--paper'];
  const ratio = contrast(hex, paper);
  const adjusted = used.toLowerCase() !== hex.toLowerCase();
  return (
    <div class="set-row custom-accent">
      <span class="set-label">
        Custom accent
        <small>A hex colour. It is checked against the paper and moved lighter or darker until it reads at AA (4.5:1).</small>
      </span>
      <div class="custom-accent-fields">
        <input
          class="field"
          type="text"
          value={text}
          maxLength={7}
          placeholder="#b0372a"
          autocapitalize="off"
          spellcheck={false}
          aria-label="Custom accent colour, hex"
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          onChange={() => {
            if (!valid) return;
            setSetting('customAccent', hex);
            setSetting('accent', 'custom');
          }}
        />
        <span class="swatch-big" style={{ background: used }} aria-hidden="true" />
        <span class="hint small">
          {valid
            ? `${ratio.toFixed(1)}:1 on this paper${adjusted ? `; shown as ${used} to reach ${AA_TEXT}:1` : ratio >= AA_TEXT ? ', passes AA' : ''}`
            : 'Enter six hex digits, e.g. #2f6b35.'}
        </span>
        <button
          type="button"
          class={`btn${s.accent === 'custom' ? ' primary' : ''}`}
          disabled={!valid}
          onClick={() => {
            setSetting('customAccent', hex);
            setSetting('accent', 'custom');
          }}
        >
          {s.accent === 'custom' ? 'In use' : 'Use it'}
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const s = settings.value;
  return (
    <article class="page settings">
      <h1>Settings</h1>
      <p class="lede">Everything here is kept with your data, included in exports, and applied before the page is drawn, so there is no flash.</p>

      <section>
        <h2>Colours</h2>
        <Seg
          name="theme"
          label="Mode"
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <div class="set-row">
          <span class="set-label" id="set-preset">
            Preset
          </span>
          <div class="presets" role="radiogroup" aria-labelledby="set-preset">
            {PRESETS.map((p) => {
              const pal = p[s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'];
              return (
                <button type="button" role="radio" aria-checked={s.preset === p.id} class="preset" title={p.description} onClick={() => setSetting('preset', p.id)}>
                  <span class="preset-chip" style={{ background: pal.paper, color: pal.ink, borderColor: pal.ruleStrong }} aria-hidden="true">
                    <b>Aa</b>
                    <i style={{ background: pal.surface }} />
                  </span>
                  <span>{p.label}</span>
                  {s.preset === p.id && <Check size={14} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
        <div class="set-row">
          <span class="set-label" id="set-accent">
            Accent
          </span>
          <div class="accents" role="radiogroup" aria-labelledby="set-accent">
            {ACCENTS.map((a) => {
              const dark = s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
              return (
                <button type="button" role="radio" aria-checked={s.accent === a.id} class="accent-swatch" aria-label={a.label} title={a.label} onClick={() => setSetting('accent', a.id)}>
                  <i style={{ background: a[dark ? 'dark' : 'light'].accent }} />
                  {s.accent === a.id && <Check size={13} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
        <CustomAccent />
        <Seg
          name="toneColours"
          label="Tone colours"
          options={[
            { value: 'off', label: 'Off' },
            { value: 'standard', label: 'Standard' },
            { value: 'safe', label: 'Colour-blind safe', hint: 'Blue, green, purple and orange from the Okabe–Ito set' },
          ]}
        />
        {s.toneColours !== 'off' && (
          <p class="hint small tone-sample" lang="zh-Latn">
            {(['mā', 'má', 'mǎ', 'mà', 'ma'] as const).map((t, i) => (
              <span data-tone={i + 1}>{t}</span>
            ))}
          </p>
        )}
      </section>

      <section>
        <h2>Type</h2>
        <div class="set-row">
          <span class="set-label" id="set-typeface">
            Typefaces
          </span>
          <div class="faces" role="radiogroup" aria-labelledby="set-typeface">
            {TYPEFACES.map((t) => (
              <button type="button" role="radio" aria-checked={s.typeface === t.id} class="face" onClick={() => setSetting('typeface', t.id)}>
                <span class="face-sample" style={{ fontFamily: t.serif }} lang="zh-Latn">
                  zhī chī shī
                </span>
                <span class="face-sample sans" style={{ fontFamily: t.sans }}>
                  {t.label}
                </span>
                <small>{t.description}</small>
              </button>
            ))}
          </div>
        </div>
        <div class="set-row">
          <span class="set-label" id="set-cjk">
            Chinese characters
          </span>
          <div class="faces" role="radiogroup" aria-labelledby="set-cjk">
            {CJK_FACES.map((c) => (
              <button type="button" role="radio" aria-checked={s.cjk === c.id} class="face" onClick={() => setSetting('cjk', c.id as Settings['cjk'])}>
                <span class="face-sample han" style={{ fontFamily: c.family }} lang="zh-Hans">
                  知吃诗
                </span>
                <span class="face-sample sans">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Seg
          name="textSize"
          label="Text size"
          options={TEXT_SIZES.map((v, i) => ({ value: i, label: ['Small', 'Normal', 'Large', 'Larger'][i], hint: `${Math.round(v * 100)}%` }))}
        />
      </section>

      <section>
        <h2>Chart</h2>
        <Seg
          name="spacing"
          label="Density"
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'spacious', label: 'Spacious' },
          ]}
        />
        <Seg
          name="density"
          label="Cell detail"
          options={[
            { value: 'auto', label: 'Automatic', hint: 'One character on narrow screens, every tone on wide ones' },
            { value: 'compact', label: 'One character' },
            { value: 'full', label: 'Every tone' },
          ]}
        />
        <Toggle name="showCharacters" label="Show example characters" hint="Off: pinyin and tone marks only" />
        <Toggle name="toneNumbers" label="Tones as numbers" hint="ma1 instead of mā" />
        <Seg
          name="cellBorders"
          label="Cell borders"
          options={[
            { value: 'hairline', label: 'Hairline' },
            { value: 'ruled', label: 'Ruled' },
            { value: 'none', label: 'None' },
          ]}
        />
        <Toggle name="heatmap" label="Colour cells by status" />
        <Toggle name="showUnverified" label="Show unverified cells" hint="Syllables and tones that only one source attests" />
      </section>

      <section>
        <h2>Motion</h2>
        <Toggle name="reduceMotion" label="Reduce motion" hint="No transitions or animated scrolling" />
      </section>

      <section>
        <h2>Practice</h2>
        <Toggle name="showPractice" label="Show the Practice area" hint="Off removes it from the navigation and hides the Practice buttons" />
        <Toggle name="practiceLink" label="“Practise this sound” link in the tone panel" />
      </section>
    </article>
  );
}
