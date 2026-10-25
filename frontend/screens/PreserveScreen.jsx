import { useState } from 'react';
import { CATEGORIES } from '../data/skills';
import { useProgress } from '../context/ProgressContext';
import { Button, Panel } from '../components/UI';

const STORAGE_KEY = 'skill-revival-guides';

export default function PreserveScreen({ onDone }) {
  const { share } = useProgress();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [taughtBy, setTaughtBy] = useState('');
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ready = title.trim().length > 0 && story.trim().length > 0;

  async function submit(event) {
    event.preventDefault();

    if (!ready || saving) return;

    setSaving(true);
    setError('');

    const guide = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: title.trim(),
      cat: category,
      taughtBy: taughtBy.trim(),
      story: story.trim(),
      photo: null,
      createdAt: new Date().toISOString(),
    };

    try {
      await share(guide);

      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        throw new Error('The guide was not found in browser storage.');
      }

      const guides = JSON.parse(stored);

      const saved = Array.isArray(guides)
        && guides.some((item) => item.id === guide.id);

      if (!saved) {
        throw new Error('The guide could not be verified after saving.');
      }

      setTitle('');
      setCategory(CATEGORIES[0].name);
      setTaughtBy('');
      setStory('');

      onDone?.();
    } catch (err) {
      console.error('Error publishing guide:', err);

      setError(
        err.message || 'Could not save your guide. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <h2 className="panelTitle">👵 Preserve a Skill</h2>

      <p className="meta">
        Share a skill you learned from your family or community.
        Keep their knowledge alive!
      </p>

      <form onSubmit={submit}>
        <label className="label" htmlFor="skill-title">
          Skill name
        </label>

        <input
          id="skill-title"
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Grandma's apple pie"
          required
        />

        <div className="label">Category</div>

        <div className="selectList">
          {CATEGORIES.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`selectOption ${
                category === item.name ? 'selectOptionActive' : ''
              }`}
              onClick={() => setCategory(item.name)}
              aria-pressed={category === item.name}
            >
              {item.icon} {item.name}
            </button>
          ))}
        </div>

        <label className="label" htmlFor="taught-by">
          Who taught you?
        </label>

        <input
          id="taught-by"
          className="input"
          value={taughtBy}
          onChange={(event) => setTaughtBy(event.target.value)}
          placeholder="e.g. My grandmother"
        />

        <label className="label" htmlFor="skill-story">
          Instructions and story
        </label>

        <textarea
          id="skill-story"
          className="textarea"
          value={story}
          onChange={(event) => setStory(event.target.value)}
          placeholder="Steps, tips, and why it matters to you"
          required
        />

        {error && (
          <p className="errorText" role="alert">
            {error}
          </p>
        )}

        <div className="buttonRow">
          <Button
            title={
              saving
                ? 'Saving...'
                : 'Publish to Library (+100 XP)'
            }
            variant="green"
            disabled={!ready || saving}
          />
        </div>
      </form>
    </Panel>
  );
}