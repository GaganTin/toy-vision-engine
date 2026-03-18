import React from 'react';

export default function ScoreGauge({ score, size = 80, label }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#1A8917' : score >= 40 ? '#E6A817' : '#C94A4A';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#F0F0F0" strokeWidth="4" fill="none" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="font-sans text-lg font-bold" style={{ color }}>{score}</span>
      </div>
      {label && <span className="text-xs font-sans text-gray-500 mt-1">{label}</span>}
    </div>
  );
}