import { CATEGORIES, SKILLS } from '../data/skills';
import { useProgress } from '../context/ProgressContext';
import { Panel } from '../components/UI';
import SkillCard from '../components/SkillCard';

export default function ExploreScreen({ onOpen }) {
  const [category, setCategory] = useState('All');
  const { done } = useProgress();

  const list = SKILLS.filter(
    (skill) => category === 'All' || skill.cat === category
  );

  return (
    <Panel>
      <h2 className="panelTitle">🏆 Explore Skills</h2>
      <p className="meta">Choose a skill and start your journey!</p>

      <div className="chips">
        {['All', ...CATEGORIES.map((item) => item.name)].map((item) => (
          <button
            type="button"
            key={item}
            className={`chip ${category === item ? 'chipActive' : ''}`}
            onClick={() => setCategory(item)}
          >
            <span className={category === item ? 'chipTextActive' : 'chipText'}>
              {item}
            </span>
          </button>
        ))}
      </div>

      <div className="grid">
        {list.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            completed={done.includes(skill.id)}
            onPress={() => onOpen(skill)}
          />
        ))}
      </div>
    </Panel>
  );
}