import { CATEGORIES } from '../data/skills';
import { Panel } from './UI';

export default function GuideCard({ guide }) {
  if (!guide) return null;

  const icon =
    CATEGORIES.find(
      (category) => category.name === guide.cat
    )?.icon || '📜';

  return (
    <Panel>
      <div className="guide">
        {guide.photo ? (
          <img
            src={guide.photo}
            alt={guide.title || 'Shared skill'}
            className="guideImage"
          />
        ) : (
          <div className="guideIcon">
            <span className="latestIcon">{icon}</span>
          </div>
        )}

        <div className="guideBody">
          <div className="guideTitle">
            {guide.title || 'Untitled Skill'}
          </div>

          <div className="meta">
            {guide.taughtBy
              ? `Taught by: ${guide.taughtBy}`
              : 'Shared by: Community'}
          </div>

          <div className="meta">
            Category: {guide.cat || 'Other'}
          </div>

          <p>{guide.story || 'No instructions provided.'}</p>
        </div>
      </div>
    </Panel>
  );
}