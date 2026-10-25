
import React from 'react';

import {
  useProgress,
  XP_PER_LEVEL,
} from '../context/ProgressContext';

export function PixelText({ children, style, className = '' }) {
  return (
    <div
      className={`text ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function Button({
  title,
  onPress,
  variant = 'blue',
  disabled = false,
  style,
  type = 'button',
}) {
  const variantClass =
    variant === 'green'
      ? 'greenButton'
      : variant === 'wood'
      ? 'woodButton'
      : 'blueButton';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onPress}
      className={`button ${variantClass} ${
        disabled ? 'disabledButton' : ''
      }`}
      style={style}
    >
      {title}
    </button>
  );
}

export function Panel({ children, style, className = '' }) {
  return (
    <section
      className={`panel ${className}`}
      style={style}
    >
      {children}
    </section>
  );
}

export function XPBar({ xp, small = false }) {
  const percentage = Math.min(
    100,
    ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100
  );

  return (
    <div className={`xpTrack ${small ? 'xpSmall' : ''}`}>
      <div
        className="xpFill"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function Header({ level, xp }) {
  return (
    <header className="header">
      <div className="sign">
        <div className="logo">🌳 SKILL REVIVAL</div>
        <div className="tagline">
          Old skills. New adventures.
        </div>
      </div>

      <div className="levelChip">
        <div className="levelText">LEVEL {level}</div>
        <XPBar xp={xp} small />
      </div>
    </header>
  );
}

export function TabBar({ tab, onChange }) {
  const tabs = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'explore', icon: '📖', label: 'Explore' },
    { id: 'skills', icon: '⭐', label: 'My Skills' },
    { id: 'library', icon: '📚', label: 'Library' },
    { id: 'preserve', icon: '🪶', label: 'Preserve' },
  ];

  return (
    <nav className="tabbar">
      {tabs.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`tab ${
            tab === item.id ? 'tabActive' : ''
          }`}
        >
          <span className="tabIcon">{item.icon}</span>
          <span className="tabLabel">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function ProgressPanel() {
  const { level, xp, done, badges, shared } = useProgress();
  const latest = badges[badges.length - 1];

  return (
    <Panel>
      <h2 className="panelTitle">Your Progress</h2>

      <div className="subTitle">Level {level}</div>

      <XPBar xp={xp} />

      <div className="meta">
        {xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP to next level
      </div>

      <div className="stats">
        <div className="statList">
          <div>📖 {done.length} Skills Learned</div>
          <div>🏅 {badges.length} Badges Earned</div>
          <div>📜 {shared.length} Skills Shared</div>
        </div>

        <div className="latest">
          <div className="meta">Latest Badge</div>
          <div className="latestIcon">
            {latest ? latest.icon : '🏅'}
          </div>
          <div className="meta">
            {latest ? latest.name : 'None yet'}
          </div>
        </div>
      </div>
    </Panel>
  );
}
