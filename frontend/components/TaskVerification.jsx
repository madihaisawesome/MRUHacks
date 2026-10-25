import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function TaskVerification({
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

    setChecking(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('taskName', taskName);
      formData.append('taskDescription', taskDescription);

      const response = await fetch(`${API_URL}/skills/verify`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('The verification service could not review your photo.');
      }

      const data = await response.json();
      const completed = Boolean(data.completed);

      setResult({
        completed,
        title: completed ? 'Task verified!' : 'Not quite there yet',
        feedback: data.feedback || 'Your photo has been reviewed.',
      });

      if (completed) {
        await onVerified?.();
      }
    } catch (err) {
      setError(
        err.message || 'Verification failed. Please try again.'
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="panel">
      <h3 className="panelTitle">📸 Verify Your Skill</h3>
      <p>
        Upload a photo of your completed task: <strong>{taskName}</strong>.
        The AI can review it and provide feedback.
      </p>

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