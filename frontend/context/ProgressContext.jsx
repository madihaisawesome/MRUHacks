import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { SKILLS } from '../data/skills';

const ProgressContext = createContext(null);

export const XP_PER_LEVEL = 250;

const DONE_STORAGE_KEY = 'skill-revival-done';
const GUIDES_STORAGE_KEY = 'skill-revival-guides';

export function useProgress() {
  const context = useContext(ProgressContext);

  if (!context) {
    throw new Error(
      'useProgress must be used inside ProgressProvider'
    );
  }

  return context;
}

export function ProgressProvider({ children }) {
  const [done, setDone] = useState([]);
  const [shared, setShared] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    try {
      const savedDone = JSON.parse(
        localStorage.getItem(DONE_STORAGE_KEY) || '[]'
      );

      const savedGuides = JSON.parse(
        localStorage.getItem(GUIDES_STORAGE_KEY) || '[]'
      );

      setDone(Array.isArray(savedDone) ? savedDone : []);
      setShared(Array.isArray(savedGuides) ? savedGuides : []);
    } catch (error) {
      console.error('Failed to load saved progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  }, []);

  const xp = done.length * 50 + shared.length * 100;

  const badges = useMemo(
    () =>
      done.map((id) => {
        const skill = SKILLS.find((item) => item.id === id);

        return {
          id,
          icon: skill?.icon || '🏅',
          name: skill?.title || 'Skill Completed',
        };
      }),
    [done]
  );

  const complete = async (id) => {
    if (done.includes(id)) return;

    const updated = [...done, id];

    try {
      localStorage.setItem(
        DONE_STORAGE_KEY,
        JSON.stringify(updated)
      );

      setDone(updated);
    } catch (error) {
      console.error('Failed to save completed skill:', error);
      throw error;
    }
  };

  const share = async (guide) => {
    if (
      !guide ||
      !guide.title?.trim() ||
      !guide.story?.trim()
    ) {
      throw new Error('A skill name and story are required.');
    }

    const savedGuide = {
      id: guide.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: guide.title.trim(),
      cat: guide.cat || 'Other',
      taughtBy: guide.taughtBy?.trim() || '',
      story: guide.story.trim(),
      photo: guide.photo || null,
      lessonId: guide.lessonId || null,
      createdAt: guide.createdAt || new Date().toISOString(),
    };

    try {
      const stored = localStorage.getItem(GUIDES_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const existingGuides = Array.isArray(parsed) ? parsed : [];

      const updated = [savedGuide, ...existingGuides];

      localStorage.setItem(
        GUIDES_STORAGE_KEY,
        JSON.stringify(updated)
      );

      const verification = localStorage.getItem(GUIDES_STORAGE_KEY);

      if (!verification) {
        throw new Error('The guide was not saved to browser storage.');
      }

      setShared(updated);

      return savedGuide;
    } catch (error) {
      console.error('Failed to save guide:', error);
      throw new Error(
        `Could not save the guide: ${error.message}`
      );
    }
  };

  const value = {
    done,
    shared,
    guides: shared,
    xp,
    badges,
    loadingProgress,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    isUnlocked: () => true,
    complete,
    share,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}