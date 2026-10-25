
import { useState } from 'react';

import {
  ProgressProvider,
  useProgress,
} from './context/ProgressContext';

import { Header, TabBar } from './components/UI';

import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import LessonScreen from './screens/LessonScreen';
import MySkillsScreen from './screens/MySkillsScreen';
import LibraryScreen from './screens/LibraryScreen';
import PreserveScreen from './screens/PreserveScreen';
import './styles.css';

function AppContent() {
  const { level, xp } = useProgress();

  const [tab, setTab] = useState('home');
  const [lesson, setLesson] = useState(null);

  const go = (nextTab) => {
    setLesson(null);
    setTab(nextTab);
  };

  const openLesson = (skill) => {
    setLesson(skill);
  };

  return (
    <div className="app">
      <div className="safeArea">
        <Header level={level} xp={xp} />

        <main className="main">
          <div className="mainContent">
            {lesson ? (
              <LessonScreen
                key={lesson.id}
                skill={lesson}
                onBack={() => setLesson(null)}
              />
            ) : tab === 'home' ? (
              <HomeScreen go={go} />
            ) : tab === 'explore' ? (
              <ExploreScreen onOpen={openLesson} />
            ) : tab === 'skills' ? (
              <MySkillsScreen />
            ) : tab === 'library' ? (
              <LibraryScreen />
            ) : (
              <PreserveScreen onDone={() => go('library')} />
            )}
          </div>
        </main>

        <TabBar
          tab={lesson ? 'explore' : tab}
          onChange={go}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ProgressProvider>
      <AppContent />
    </ProgressProvider>
  );
}