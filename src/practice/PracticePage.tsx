/**
 * Practice: guided sessions built from a scope, and two listening tools.
 * Loaded as its own chunk. No streaks, badges or reminders; nothing here
 * changes a cell's status unless you set it yourself or accept the offer at
 * the end of a quiz.
 */
import { useState } from 'preact/hooks';
import { route } from '../lib/router';
import { parseScope, practiceHash } from '../lib/routes';
import { scopeCells } from '../lib/scope';
import { STAGES, stageCells } from '../data/learn';
import { settings, statuses } from '../lib/store';
import { Crumbs, MoreLink, count } from '../components/common';
import { Target } from '../components/icons';
import { Quiz } from './Quiz';
import { Pairs } from './Pairs';
import { Session } from './Session';

function Hub() {
  const [tool, setTool] = useState<'quiz' | 'pairs'>('quiz');
  const st = statuses.value;
  const show = settings.value.showUnverified;
  const shaky = scopeCells({ kind: 'shaky', id: '' }, st).length;
  return (
    <article class="page practice">
      <Crumbs />
      <h1>Practice</h1>
      <p class="purpose">Drills: pick a set of sounds and work through it now. What each stage is, and what to study next, is in Learn.</p>
      <p class="lede">
        A session steps through the set one tone at a time: listen, hear the pairs it is confused with, record yourself, compare, and mark how well you
        know it. Works offline with the clips you have downloaded.
      </p>

      <section>
        <h2>Pick a set</h2>
        <ul class="set-list">
          <li>
            <span class="set-what">
              <b>My shaky syllables</b>
              <small>{shaky ? `${count(shaky, 'tone')} marked shaky` : 'Nothing is marked shaky yet'}</small>
            </span>
            {shaky ? (
              <a class="btn primary" href={practiceHash({ kind: 'shaky', id: '' })} aria-label="Practise my shaky syllables">
                <Target size={15} aria-hidden="true" />
                Practise
              </a>
            ) : (
              <span class="hint small">Mark a tone shaky to fill this set</span>
            )}
          </li>
          {STAGES.map((s, i) => (
            <li key={s.id}>
              <span class="set-what">
                <b>
                  Stage {i + 1}: {s.title}
                </b>
                <small>
                  {count(stageCells(s, show).length, 'tone')} · <a href={`#/learn/${s.id}`}>Read about this stage</a>
                </small>
              </span>
              <a class="btn" href={practiceHash({ kind: 'stage', id: s.id })} aria-label={`Practise stage ${i + 1}: ${s.title}`}>
                <Target size={15} aria-hidden="true" />
                Practise
              </a>
            </li>
          ))}
        </ul>
        <p class="ov-links">
          Every group, initial and category page has a Practise button too:
          <MoreLink href="#/finals">Finals</MoreLink>
          <MoreLink href="#/initials">Initials</MoreLink>
          <MoreLink href="#/browse">Browse by category</MoreLink>
        </p>
      </section>

      <section>
        <h2>Listening tools</h2>
        <p class="hint">Ten questions each, on the native recordings. Tones you marked shaky, and ones you got wrong recently, come up more often.</p>
        <div class="seg practice-tools" role="tablist" aria-label="Listening tool">
          <button type="button" role="tab" aria-selected={tool === 'quiz'} onClick={() => setTool('quiz')}>
            Listening quiz
          </button>
          <button type="button" role="tab" aria-selected={tool === 'pairs'} onClick={() => setTool('pairs')}>
            Minimal pairs
          </button>
        </div>
        {tool === 'quiz' ? <Quiz startSyllable={null} /> : <Pairs />}
      </section>
    </article>
  );
}

export default function PracticePage() {
  const scope = parseScope(route.value.block);
  return scope ? <Session key={route.value.block!} scope={scope} /> : <Hub />;
}
