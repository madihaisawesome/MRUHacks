import { useProgress } from '../context/ProgressContext';
import { Button, Panel } from '../components/UI';
import GuideCard from '../components/GuideCard';
import { CATEGORIES } from '../data/skills';

export default function LibraryScreen({ onOpen }) {
  const { guides } = useProgress();

  function openGuide(guide) {
    if (!onOpen) return;

    const icon =
      CATEGORIES.find((category) => category.name === guide.cat)?.icon ||
      '📜';

    onOpen({
      id: guide.lessonId || guide.id,
      lessonId: guide.lessonId || guide.id,
      title: guide.title,
      cat: guide.cat,
      level: 'Preserved',
      time: 'Custom',
      icon,
      materials: [],
    });
  }

  return (
    <>
      <h2 className="sectionTitle">Knowledge Library</h2>

      {guides.map((guide) => (
        <div key={guide.id} className="libraryItem">
          <GuideCard guide={guide} />
          {(guide.lessonId || guide.id) && onOpen && (
            <div className="buttonRow" style={{ marginTop: 8 }}>
              <Button
                title="Learn this skill"
                variant="green"
                onPress={() => openGuide(guide)}
              />
            </div>
          )}
        </div>
      ))}

      {guides.length === 0 && (
        <Panel>
          <p className="meta">
            No skills shared yet. Be the first to preserve a skill!
          </p>
        </Panel>
      )}
    </>
  );
}
