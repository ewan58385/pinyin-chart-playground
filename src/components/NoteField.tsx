import { useEffect, useRef, useState } from 'preact/hooks';

/**
 * A textarea that saves by itself: shortly after typing stops, and again on
 * blur or when the view is left, so nothing is lost by switching syllable.
 */
export function NoteField({
  label,
  hideLabel,
  placeholder,
  initial,
  rows = 3,
  onSave,
}: {
  label: string;
  hideLabel?: boolean;
  placeholder?: string;
  initial: string;
  rows?: number;
  onSave: (text: string) => Promise<boolean> | void;
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const latest = useRef(initial);
  const stored = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = () => {
    clearTimeout(timer.current);
    if (latest.current === stored.current) return;
    stored.current = latest.current;
    void Promise.resolve(onSave(latest.current)).then((ok) => {
      if (ok !== false) setSaved(true);
    });
  };

  useEffect(() => flush, []);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <label class="note-field">
      <span class={`label${hideLabel ? ' only-status' : ''}`}>
        <span class={hideLabel ? 'sr-only' : ''}>{label}</span>
        <span class="saved" aria-live="polite">
          {saved ? 'Saved' : ''}
        </span>
      </span>
      <textarea
        class="field"
        rows={rows}
        value={text}
        placeholder={placeholder}
        onInput={(e) => {
          const v = (e.target as HTMLTextAreaElement).value;
          setText(v);
          latest.current = v;
          clearTimeout(timer.current);
          timer.current = setTimeout(flush, 600);
        }}
        onBlur={flush}
      />
    </label>
  );
}
