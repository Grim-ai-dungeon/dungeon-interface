import { useEffect, useRef } from 'react';

interface StatBarProps {
  label: string;
  value: number;
  color: 'green' | 'blue' | 'purple' | 'gold' | 'red' | 'cyan';
}

export function StatBar({ label, value, color }: StatBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (fillRef.current) {
        fillRef.current.style.width = `${value}%`;
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="stat-bar-container">
      <div className="stat-bar-label">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="stat-bar-track">
        <div ref={fillRef} className={`stat-bar-fill ${color}`} />
      </div>
    </div>
  );
}
