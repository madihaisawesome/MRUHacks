import { useState } from 'react';
import { CATEGORIES } from '../data/skills';
import { useProgress } from '../context/ProgressContext';
import { Button, Panel } from '../components/UI';
import { generateLesson } from '../api';

export default function PreserveScreen({ onDone }) {
  const { share } = useProgress();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [taughtBy, setTaughtBy] = useState('');
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const ready = title.trim().length > 0 && story.trim().length > 0;

  async function publish() {
    if (!ready || saving) return;

    setSaving(true);
    setError('');
    setStatus('Building a coachable lesson from your notes...');

    try {
      const text = [
        title.trim(),
        taughtBy.trim() ? `Taught by: ${taughtBy.trim()}` : '',
        story.trim(),
      ]
        .filter(Boolean)
        .join('\n\n');

      const lesson = await generateLesson({
        text,
        category,
        preservedBy: {
          name: taughtBy.trim() || 'Community',
          story: story.trim().slice(0, 400),
        },
      });

      setStatus('Saving to your library...');

      await share({
        id: lesson.id,
        title: lesson.skill || title.trim(),
        cat: lesson.category || category,
        taughtBy: taughtBy.trim(),
        story: story.trim(),
        lessonId: lesson.id,
        photo: null,
      });

      setTitle('');
      setCategory(CATEGORIES[0].name);
      setTaughtBy('');
      setStory('');
      setStatus('');
      onDone?.();
    } catch (err) {
      console.error('Error publishing guide:', err);
      setStatus('');
      setError(
        err.message || 'Could not save your guide. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    publish();
  }

  return (
    <Panel>
      <h2 className="panelTitle">👵 Preserve a Skill</h2>

      <p className="meta">
        Share a skill you learned from your family or community.
        We turn your notes into a webcam-coachable lesson.
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

        {status && <p className="meta">{status}</p>}

        {error && (
          <p className="errorText" role="alert">
            {error}
          </p>
        )}

        <div className="buttonRow">
          <Button
            type="submit"
            title={
              saving
                ? 'Publishing...'
                : 'Publish to Library (+100 XP)'
            }
            variant="green"
            disabled={!ready || saving}
            onPress={publish}
          />
        </div>
      </form>
    </Panel>
  );
}
