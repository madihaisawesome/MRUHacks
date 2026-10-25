import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useProgress } from '../context/ProgressContext';
import { Button, Panel } from '../components/UI';
import WebcamPanel, { fingerprintsDiffer } from '../components/WebcamPanel';
import {
  advanceStep,
  checkFrame,
  confirmStep,
  getLesson,
  lessonIdForSkill,
  startSession,
  verifyFinal,
} from '../api';

export default function LessonScreen({ skill, onBack }) {
  const webcamRef = useRef(null);
  const checkingRef = useRef(false);
  const lastFingerprintRef = useRef(null);
  const stepAnimRef = useRef(null);

  const [sessionId, setSessionId] = useState('');
  const [steps, setSteps] = useState([]);
  const [materials, setMaterials] = useState(skill.materials || []);
  const [currentStep, setCurrentStep] = useState(null);
  const [totalSteps, setTotalSteps] = useState(0);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [phase, setPhase] = useState('steps'); // steps | final | badge

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const [watching, setWatching] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [passStreak, setPassStreak] = useState(0);
  const [lookingGood, setLookingGood] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [needsSelfConfirm, setNeedsSelfConfirm] = useState(false);
  const [visibleIssue, setVisibleIssue] = useState(false);
  const [stepFlash, setStepFlash] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const [finalWatching, setFinalWatching] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState('');
  const [finalScore, setFinalScore] = useState(null);
  const [finalPassed, setFinalPassed] = useState(false);
  const [badgeEarned, setBadgeEarned] = useState(false);

  const { complete, done } = useProgress();
  const alreadyDone = done.includes(skill.id);

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError('');
    setFeedback('');
    setPassStreak(0);
    setLookingGood(false);
    setShowHint(false);
    setNeedsSelfConfirm(false);
    setVisibleIssue(false);
    setLessonComplete(false);
    setPhase('steps');
    setFinalFeedback('');
    setFinalScore(null);
    setFinalPassed(false);
    setBadgeEarned(false);
    lastFingerprintRef.current = null;

    try {
      const id = lessonIdForSkill(skill);
      const lesson = await getLesson(id);
      const session = await startSession(lesson.id);

      setSessionId(session.sessionId);
      setSteps(lesson.steps || []);
      setMaterials(lesson.materials || skill.materials || []);
      setTotalSteps(session.totalSteps || lesson.steps?.length || 0);
      setCurrentStep(session.step || lesson.steps?.[0] || null);
      setLessonComplete(Boolean(session.completed));
      if (session.completed) setPhase('final');
    } catch (err) {
      setError(err.message || 'Could not start the lesson.');
    } finally {
      setLoading(false);
    }
  }, [skill]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson, retryKey]);

  function applyCheckResponse(data) {
    if (data.tooFast) return;

    setFeedback(data.coachLine || data.feedback || '');
    setPassStreak(Number(data.passStreak) || 0);
    setLookingGood(Boolean(data.lookingGood) || Number(data.passStreak) >= 1);
    setShowHint(Boolean(data.hint));
    setNeedsSelfConfirm(Boolean(data.needsSelfConfirm));
    setVisibleIssue(data.visible === false);

    if (data.currentStep) {
      setCurrentStep(data.currentStep);
    }

    if (data.advanced) {
      setStepFlash(true);
      clearTimeout(stepAnimRef.current);
      stepAnimRef.current = setTimeout(() => setStepFlash(false), 700);
      setPassStreak(0);
      setLookingGood(false);
      setShowHint(false);
      setNeedsSelfConfirm(false);
      setFeedback(data.coachLine || data.feedback || '');
    }

    if (data.completed) {
      setLessonComplete(true);
      setPhase('final');
      setNeedsSelfConfirm(false);
      setLookingGood(false);
    }
  }

  async function runAdvance({ skipped = false } = {}) {
    if (!sessionId || advancing || watching || phase !== 'steps') return;
    setAdvancing(true);
    try {
      const data = await advanceStep(sessionId);
      applyCheckResponse({
        ...data,
        feedback: skipped
          ? (data.completed
            ? 'Skipped ahead to the final check.'
            : `${data.feedback || 'Moved on.'}`)
          : data.feedback,
      });
    } catch (err) {
      setFeedback(err.message || 'Could not move to the next step.');
    } finally {
      setAdvancing(false);
    }
  }

  async function runCheck({ quiet429 = false } = {}) {
    if (!sessionId || checkingRef.current || lessonComplete || phase !== 'steps') {
      return;
    }

    checkingRef.current = true;
    setWatching(true);
    setVisibleIssue(false);

    try {
      const image = await webcamRef.current.captureJpegBase64();
      const data = await checkFrame(sessionId, image, { quiet429 });
      applyCheckResponse(data);
      lastFingerprintRef.current = webcamRef.current.getFingerprint?.() || null;
    } catch (err) {
      if (!quiet429) {
        setFeedback(err.message || 'Check failed. Try again.');
      }
    } finally {
      checkingRef.current = false;
      setWatching(false);
    }
  }

  async function runConfirm() {
    if (!sessionId || checkingRef.current) return;
    checkingRef.current = true;
    setWatching(true);
    try {
      const data = await confirmStep(sessionId);
      applyCheckResponse(data);
    } catch (err) {
      setFeedback(err.message || 'Could not confirm that step.');
    } finally {
      checkingRef.current = false;
      setWatching(false);
    }
  }

  useEffect(() => {
    if (!autoCheck || phase !== 'steps' || lessonComplete || needsSelfConfirm) {
      return undefined;
    }

    const timer = setInterval(async () => {
      if (checkingRef.current) return;
      const next = webcamRef.current?.getFingerprint?.() || null;
      const prev = lastFingerprintRef.current;
      if (next && prev && !fingerprintsDiffer(prev, next)) {
        return;
      }
      await runCheck({ quiet429: true });
    }, 5000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck, phase, lessonComplete, needsSelfConfirm, sessionId]);

  async function runFinalVerify() {
    if (!sessionId || checkingRef.current || badgeEarned) return;
    checkingRef.current = true;
    setFinalWatching(true);
    setFinalFeedback('');

    try {
      const image = await webcamRef.current.captureJpegBase64();
      const data = await verifyFinal(sessionId, image);
      if (data.tooFast) return;

      setFinalScore(data.score ?? null);
      setFinalFeedback(data.feedback || '');
      setFinalPassed(Boolean(data.passed));

      if (data.passed && data.badge) {
        setBadgeEarned(true);
        setPhase('badge');
        if (!alreadyDone) {
          try {
            await complete(skill.id);
          } catch {
            /* progress save is best-effort */
          }
        }
      }
    } catch (err) {
      setFinalPassed(false);
      setFinalFeedback(err.message || 'Final check failed. Try again.');
    } finally {
      checkingRef.current = false;
      setFinalWatching(false);
    }
  }

  const stepNumber = currentStep?.id || 1;
  const progressLabel = `Step ${stepNumber} / ${totalSteps || steps.length || '?'}`;

  return (
    <Panel className="lessonScreen">
      <div className="rowBetween">
        <button type="button" className="backButton" onClick={onBack}>
          ← Back
        </button>
        <span className="tag">{skill.level}</span>
      </div>

      <h2 className="panelTitle">
        {skill.icon} {skill.title}
      </h2>

      {loading ? (
        <div className="loadingContainer">
          <div className="latestIcon" aria-hidden="true">⏳</div>
          <p className="meta">Starting your coaching session...</p>
        </div>
      ) : error ? (
        <>
          <p className="errorText" role="alert">{error}</p>
          <Button title="Try Again" onPress={() => setRetryKey((n) => n + 1)} />
        </>
      ) : phase === 'badge' || (badgeEarned && finalPassed) ? (
        <div className="reward lessonBadge">
          <div className="rewardIcon">🏅</div>
          <h3 className="subTitle">Badge earned!</h3>
          <p className="meta">
            {finalFeedback || 'Your finished result passed the final check.'}
          </p>
          {finalScore != null && (
            <p className="scorePill">Score: {finalScore}</p>
          )}
          <p className="meta">+50 XP saved to your progress.</p>
          <Button title="Done" variant="green" onPress={onBack} />
        </div>
      ) : phase === 'final' ? (
        <div className="lessonLayout">
          <div className="lessonCopy">
            <h3 className="subTitle">Final result check</h3>
            <p className="stepText">
              Show the finished result clearly — use the webcam or upload a photo.
            </p>
            {finalFeedback && (
              <div
                className={`feedbackBox ${finalPassed ? 'feedbackOk' : 'feedbackBad'}`}
              >
                {finalFeedback}
              </div>
            )}
            {finalScore != null && !finalPassed && (
              <p className="meta">Score: {finalScore} — try another photo.</p>
            )}
            <div className="buttonRow">
              <Button
                title={finalWatching ? 'Watching...' : 'Verify final result'}
                variant="green"
                disabled={finalWatching}
                onPress={runFinalVerify}
              />
            </div>
          </div>
          <WebcamPanel ref={webcamRef} disabled={finalWatching} />
        </div>
      ) : (
        <div className={`lessonLayout ${stepFlash ? 'lessonAdvance' : ''}`}>
          <div className="lessonCopy">
            {materials?.length > 0 && (
              <>
                <h3 className="subTitle">Materials</h3>
                <div className="materials">
                  {materials.map((material, index) => (
                    <span className="material" key={`${material}-${index}`}>
                      {material}
                    </span>
                  ))}
                </div>
              </>
            )}

            <p className="meta">{progressLabel}</p>
            <h3 className={`subTitle ${stepFlash ? 'stepTitleFlash' : ''}`}>
              {currentStep?.title || 'Current step'}
            </h3>
            <p className="stepText">{currentStep?.instruction}</p>

            {lookingGood && (
              <p className="streakNote">
                Looks good — tap Next step when you&apos;re ready.
              </p>
            )}

            {visibleIssue && (
              <p className="errorText" role="alert">
                I can&apos;t see your work clearly — adjust the camera or lighting
                and try again.
              </p>
            )}

            {feedback && (
              <div
                className={`feedbackBox ${
                  lookingGood ? 'feedbackOk' : showHint ? 'feedbackHint' : ''
                }`}
              >
                {showHint && <strong className="hintLabel">Hint: </strong>}
                {feedback}
              </div>
            )}

            <label className="autoCheckToggle">
              <input
                type="checkbox"
                checked={autoCheck}
                onChange={(event) => setAutoCheck(event.target.checked)}
                disabled={watching || needsSelfConfirm || advancing}
              />
              Auto-check every 5 seconds
            </label>

            <div className="buttonRow">
              {needsSelfConfirm ? (
                <Button
                  title={watching ? 'Watching...' : 'I did this'}
                  variant="green"
                  disabled={watching || advancing}
                  onPress={runConfirm}
                />
              ) : (
                <Button
                  title={watching ? 'Watching...' : 'Check my work'}
                  variant="green"
                  disabled={watching || advancing}
                  onPress={() => runCheck({ quiet429: false })}
                />
              )}

              {lookingGood ? (
                <Button
                  title={advancing ? 'Moving on...' : 'Next step →'}
                  variant="green"
                  disabled={watching || advancing}
                  onPress={() => runAdvance({ skipped: false })}
                />
              ) : (
                <Button
                  title={advancing ? 'Moving on...' : 'Skip this step →'}
                  variant="wood"
                  disabled={watching || advancing}
                  onPress={() => runAdvance({ skipped: true })}
                />
              )}
            </div>
          </div>

          <WebcamPanel ref={webcamRef} disabled={watching} />
        </div>
      )}
    </Panel>
  );
}
