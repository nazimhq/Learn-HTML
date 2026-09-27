'use client';

export default function Tabs<T extends string>({tabs, active, onChange}: {
  tabs: Array<{key: T; label: string; count?: number}>;
  active: T;
  onChange: (key: T) => void;
}) {
  return <div className="tabs" role="tablist">
    {tabs.map(t => <button
      key={t.key}
      type="button"
      role="tab"
      aria-selected={t.key === active}
      className={'tab' + (t.key === active ? ' active' : '')}
      onClick={() => onChange(t.key)}
    >
      {t.label}
      {typeof t.count === 'number' && <span className="tab-count">{t.count}</span>}
    </button>)}
  </div>;
}
