export default function SkillCard({ skill, completed, onPress }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`skillCard ${completed ? 'skillDone' : ''}`}
    >
      <span className="skillIcon">{skill.icon}</span>
      <span className="skillTitle">{skill.title}</span>
      <span className="meta">{skill.level}</span>
      <span className="meta">
        ⏱ {skill.time}{completed ? ' ✓' : ''}
      </span>
    </button>
  );
}