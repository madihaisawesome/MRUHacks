import React, { useState } from 'react';
import { checkFrame, fileToJpegBase64 } from '../api';

export default function TaskVerification({
  sessionId = '',
  taskName = 'Selected Skill',
  taskDescription = '',
  onVerified,
  disabled = false,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (preview) URL.revokeObjectURL(preview);

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError('');
    setResult(null);
  }

  async function checkTask() {
    if (!file || checking || disabled) return;

    if (!sessionId) {
      setError('No coaching session yet. Go back and open the skill again.');
      return;
    }

    setChecking(true);
    setError('');
    setResult(null);

    try {
      const image = await fileToJpegBase64(file);
      const data = await checkFrame(sessionId, image);

      if (data.needsSelfConfirm) {
        setResult({
          completed: false,
          title: 'Self-check step',
          feedback:
            data.coachLine ||
            data.feedback ||
            'This step cannot be checked by camera. Confirm it in the coach flow when you are ready.',
        });
        return;
      }

      const completed = Boolean(
        data.completed || (data.stepComplete && !data.currentStep),
      );
      const lookingGood = Boolean(
        data.criteria_met || data.stepComplete || data.passStreak > 0,
      );

      setResult({
        completed: completed || lookingGood,
        title: completed
          ? 'Lesson complete!'
          : lookingGood
            ? 'Looking good!'
            : 'Not quite there yet',
        feedback:
          data.coachLine ||
          data.feedback ||
          'Your photo has been reviewed.',
      });

      if (completed || data.stepComplete || lookingGood) {
        await onVerified?.();
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="panel">
      <h3 className="panelTitle">📸 Verify Your Skill</h3>
      <p>
        Upload a photo of your work on: <strong>{taskName}</strong>.
        The coach reviews it against the current lesson step.
      </p>
      {taskDescription ? (
        <p className="meta" style={{ whiteSpace: 'pre-wrap' }}>
          {taskDescription}
        </p>
      ) : null}

      <label className="label" htmlFor="task-photo">
        Choose a photo
      </label>

      <input
        id="task-photo"
        className="input"
        type="file"
        accept="image/*"
        onChange={chooseFile}
        disabled={checking || disabled}
      />

      {preview && (
        <div style={{ marginTop: 12 }}>
          <img
            src={preview}
            alt={`Your completed ${taskName}`}
            style={{
              display: 'block',
              width: '100%',
              maxHeight: 320,
              objectFit: 'contain',
              border: '4px solid var(--ink)',
              background: 'var(--track)',
            }}
          />
        </div>
      )}

      {error && <p className="errorText" role="alert">{error}</p>}

      {file && (
        <div className="buttonRow">
          <button
            type="button"
            className="button greenButton"
            onClick={checkTask}
            disabled={checking || disabled}
          >
            {checking ? 'Checking your work...' : 'Check My Task'}
          </button>
        </div>
      )}

      {result && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 className="subTitle">{result.title}</h3>
          <p>{result.feedback}</p>
        </div>
      )}
    </section>
  );
}
