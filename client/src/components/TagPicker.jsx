import { useId, useState } from 'react';
import { api } from '../api/client.js';
import { useLoad } from '../lib/useLoad.js';

const MAX_TAGS = 5;

// Same rule as the server: "Node JS " -> "node-js".
function normalise(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30);
}

// Pick existing tags from suggestions, or type a new one and press Enter or comma.
// `value` is an array of tag names.
export function TagPicker({ value, onChange, error }) {
  const id = useId();
  const [text, setText] = useState('');
  const { data } = useLoad(() => api('/tags'), []);

  const query = normalise(text);
  const suggestions = (data?.tags ?? [])
    .filter((t) => !value.includes(t.name) && (!query || t.name.includes(query)))
    .slice(0, 8);
  const full = value.length >= MAX_TAGS;

  function add(name) {
    const tag = normalise(name);
    if (tag && /[a-z0-9]/.test(tag) && !value.includes(tag) && !full) onChange([...value, tag]);
    setText('');
  }
  const remove = (name) => onChange(value.filter((t) => t !== name));

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // Enter would otherwise submit the whole post
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>Tags <span className="muted">({value.length}/{MAX_TAGS})</span></label>
      <div className="tag-picker">
        {value.map((name) => (
          <span key={name} className="tag-picked">
            #{name}
            <button type="button" onClick={() => remove(name)} aria-label={`Remove tag ${name}`}>×</button>
          </span>
        ))}
        {!full && (
          <input
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => text.trim() && add(text)} // don't lose a half-typed tag
            placeholder={value.length ? 'Add another…' : 'Type a tag and press Enter'}
            aria-invalid={Boolean(error)}
          />
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      {!full && suggestions.length > 0 && (
        <div className="tag-suggestions" aria-label="Existing tags">
          <span className="muted">{query ? 'Matching tags:' : 'Popular tags:'}</span>
          {suggestions.map((t) => (
            // onMouseDown runs before the input's blur, so the click isn't lost.
            <button key={t._id} type="button" onMouseDown={(e) => { e.preventDefault(); add(t.name); }}>
              #{t.name} <span className="muted">{t.postCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
