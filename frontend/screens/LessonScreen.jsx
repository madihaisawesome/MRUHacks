import { useState, useCallback, useEffect } from 'react';
import { useProgress } from '../context/ProgressContext';
import { Button, Panel } from '../components/UI';
import TaskVerification from '../components/TaskVerification';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3001'
).replace(/\/$/, '');

export default function LessonScreen({ skill, onBack }) {
  const [steps, setSteps] = useState([]);
  const [materials, setMaterials] = useState(skill.materials || []);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');

  const { complete, done } = useProgress();

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError('');
    setSteps([]);
    setStepIndex(0);
    setVerified(false);
    setCompletionError('');

    try {
      const response = await fetch(`${API_URL}/generate-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: skill.title,
          category: skill.cat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not generate the lesson.'
        );
      }

      const lesson = data.lesson || data;

      const generatedSteps = (lesson.steps || []).map((item) => ({
        t: item.t || item.title || '',
        d:
          item.d ||
          item.instruction ||
          item.description ||
          '',
      }));

      if (!generatedSteps.length) {
        throw new Error('The AI did not return any lesson steps.');
      }

      setSteps(generatedSteps);
      setMaterials(lesson.materials || skill.materials || []);
    } catch (err) {
      setError(
        err.message || 'Could not load the lesson. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [skill.id, skill.title, skill.cat, skill.level, skill.materials]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson, retryKey]);

  const step = steps[stepIndex];
  const last = steps.length > 0 && stepIndex === steps.length - 1;
  const alreadyDone = done.includes(skill.id);

  async function handleVerified() {
    if (alreadyDone || completing) return;

    setCompleting(true);
    setCompletionError('');

    try {
      await complete(skill.id);
      setVerified(true);
    } catch {
      setCompletionError(
        'The task was verified, but progress could not be saved. Please try again.'
      );
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Panel>
      <div className="rowBetween">
        <button
          type="button"
          className="backButton"
          onClick={onBack}
        >
          ← Back
        </button>

        <span className="tag">{skill.level}</span>
      </div>

      <h2 className="panelTitle">
        {skill.icon} {skill.title}
      </h2>

      {loading ? (
        <div className="loadingContainer">
          <div className="latestIcon" aria-hidden="true">
            ⏳
          </div>
          <p className="meta">Generating your lesson...</p>
        </div>
      ) : error ? (
        <>
          <p className="errorText" role="alert">
            {error}
          </p>

          <Button
            title="Try Again"
            onPress={() => setRetryKey((n) => n + 1)}
          />
        </>
      ) : (
        <>
          <h3 className="subTitle">Materials</h3>

          <div className="materials">
            {materials.map((material, index) => (
              <span
                className="material"
                key={`${material}-${index}`}
              >
                {material}
              </span>
            ))}
          </div>

          <p className="meta">
            Step {stepIndex + 1} / {steps.length}
          </p>

          <h3 className="subTitle">{step?.t}</h3>
          <p className="stepText">{step?.d}</p>

          {!last ? (
            <div className="buttonRow">
              <Button
                title="← Previous"
                disabled={stepIndex === 0}
                onPress={() =>
                  setStepIndex((n) => Math.max(0, n - 1))
                }
              />

              <Button
                title="Next →"
                onPress={() =>
                  setStepIndex((n) =>
                    Math.min(steps.length - 1, n + 1)
                  )
                }
              />
            </div>
          ) : (
            <>
              <TaskVerification
                key={skill.id}
                taskName={skill.title}
                taskDescription={steps
                  .map(
                    (item, index) =>
                      `${index + 1}. ${item.t}: ${item.d}`
                  )
                  .join('\n')}
                onVerified={handleVerified}
                disabled={alreadyDone || verified || completing}
              />

              {completing && (
                <p className="meta">Saving your progress...</p>
              )}

              {completionError && (
                <p className="errorText" role="alert">
                  {completionError}
                </p>
              )}

              {(verified || alreadyDone) && (
                <div className="reward">
                  <div className="rewardIcon">🎉</div>
                  <h3 className="subTitle">
                    Skill completed! +50 XP
                  </h3>
                  <p className="meta">
                    Great work learning a practical skill.
                  </p>
                </div>
              )}

              <Button
                title="← Previous"
                onPress={() =>
                  setStepIndex((n) => Math.max(0, n - 1))
                }
              />
            </>
          )}
        </>
      )}
    </Panel>
  );
}