
import { useProgress } from '../context/ProgressContext';
import { SKILLS } from '../data/skills';
import { Panel } from '../components/UI';
import SkillCard from '../components/SkillCard';

export default function LibraryScreen({ onSelectSkill }) {
  const { done } = useProgress();

  const mySkills = SKILLS.filter((skill) =>
    done.includes(skill.id)
  );

  return (
    <>
      <h2 className="sectionTitle">My Skills</h2>

      {mySkills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          completed
          onPress={() => onSelectSkill?.(skill)}
        />
      ))}

      {mySkills.length === 0 && (
        <Panel>
          <p className="meta">
            No skills learned yet. Go to Explore and complete a lesson to add one!
          </p>
        </Panel>
      )}
    </>
  );
}
