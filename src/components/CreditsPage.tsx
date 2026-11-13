/**
 * Credits and licences: every source, font, icon set and library in the app,
 * from src/data/credits.ts. The full licence texts are a separate file loaded
 * when the page opens; it is part of the app, so it works offline.
 */
import { useEffect, useState } from 'preact/hooks';
import { CREDITS, CREDIT_GROUPS, type Credit } from '../data/credits';
import { OPEN_DATA_URL } from '../config';

const Ext = ({ href, children }: { href: string; children: preact.ComponentChildren }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

function CreditEntry({ c, texts }: { c: Credit; texts: Record<string, string> | null }) {
  const text = c.licenceText ? texts?.[c.licenceText] : undefined;
  return (
    <li class="credit">
      <h3>
        <Ext href={c.url}>{c.name}</Ext>
        {c.version && <small>{c.version}</small>}
      </h3>
      <p class="credit-for">{c.provides}.</p>
      {c.holder && <p>By {c.holder}.</p>}
      <p>
        Licence: {c.licenceUrl ? <Ext href={c.licenceUrl}>{c.licence}</Ext> : c.licence}.
      </p>
      {c.notes?.map((n) => (
        <p class="hint small">{n}</p>
      ))}
      {c.licenceText && (
        <details>
          <summary>Licence text</summary>
          {text ? (
            <pre tabIndex={0} aria-label={`Licence text for ${c.name}`}>
              {text}
            </pre>
          ) : (
            <p class="hint small">{texts ? 'Not available.' : 'Loading…'}</p>
          )}
        </details>
      )}
    </li>
  );
}

export function CreditsPage() {
  const [texts, setTexts] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let live = true;
    import('../data/generated/licence-texts.json').then(
      (m) => live && setTexts(m.default as Record<string, string>),
      () => live && setTexts({}),
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <article class="page credits">
      <p class="back-link">
        <a href="#/about">← About</a>
      </p>
      <h1>Credits and licences</h1>
      <p class="lede">Pinyin Chart is built on the work of the people and projects below. Thank you to all of them.</p>
      <p>
        The recordings and the example data (meanings, example words and readings) are shared under Creative Commons Attribution-ShareAlike, as their sources
        require.
        {OPEN_DATA_URL && (
          <>
            {' '}
            <Ext href={OPEN_DATA_URL}>Get the data and recordings under CC BY-SA</Ext>.
          </>
        )}
      </p>
      {CREDIT_GROUPS.map((g) => {
        const list = CREDITS.filter((c) => c.group === g.id);
        if (!list.length) return null;
        return (
          <section key={g.id} aria-labelledby={`credits-${g.id}`}>
            <h2 id={`credits-${g.id}`}>{g.title}</h2>
            <ul class="credit-list">
              {list.map((c) => (
                <CreditEntry key={c.id} c={c} texts={texts} />
              ))}
            </ul>
          </section>
        );
      })}
    </article>
  );
}
