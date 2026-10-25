import { useProgress } from '../context/ProgressContext';
import { Panel } from '../components/UI';
import GuideCard from '../components/GuideCard';

export default function LibraryScreen() {
  const { guides } = useProgress();

  return (
    <>
      <h2 className="sectionTitle">Knowledge Library</h2>

      {guides.map((guide) => (
        <GuideCard key={guide.id} guide={guide} />
      ))}

      {guides.length === 0 && (
        <Panel>
          <p className="meta">
            No skills acquired yet. Go to explore to find one!
          </p>
        </Panel>
      )}
    </>
  );
}