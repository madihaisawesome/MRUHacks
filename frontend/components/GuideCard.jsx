import { CATEGORIES } from '../data/skills';
import { Panel } from './UI';

export default function GuideCard({ guide }) {
  if (!guide) return null;

  const icon =
    CATEGORIES.find((category) => category.name === guide.cat)?.icon || '📜';

  return (
    <Panel>
      <div className="guide">
        {guide.photo ? (
          <img
            src={guide.photo}
            alt={guide.title}
            className="guideImage"
          />
        ) : (
          <div className="guideIcon">
            <span className="latestIcon">{icon}</span>
          </div>
        )}

        <div className="guideBody">
          <div className="guideTitle">{guide.title}</div>

          <div className="meta">
            Shared by: {guide.by || 'Community'}
            {guide.taughtBy ? ` · taught by ${guide.taughtBy}` : ''}
          </div>

          <p>{guide.story}</p>
        </div>
      </div>
    </Panel>
  );
}