import { useProgress } from '../context/ProgressContext';
import { Button, Panel, ProgressPanel } from '../components/UI';
import GuideCard from '../components/GuideCard';

export default function HomeScreen({ go }) {
  const { guides } = useProgress();

  return (
    <>
      <Panel className="hero">
        <h2 className="heroTitle">Revitalize old skills.</h2>
        <p className="heroCopy">Learn something useful. Pass it on.</p>

        <div className="buttonRow">
          <Button title="Explore Skills" onPress={() => go('explore')} />
          <Button
            title="+ Preserve a Skill"
            variant="green"
            onPress={() => go('preserve')}
          />
        </div>
      </Panel>

      <ProgressPanel />

      <h2 className="sectionTitle">⭐ Community Highlights</h2>

      {guides.length > 0 ? (
        <GuideCard guide={guides[0]} />
      ) : (
        <Panel>
          <p className="meta">
            Your community's stories will appear here once someone shares a skill.
          </p>
          <Button
            title="Share the first skill"
            variant="green"
            onPress={() => go('preserve')}
          />
        </Panel>
      )}
    </>
  );
}