import React from 'react';
import { Search, BarChart3, Target, Check, Loader2, ClipboardType } from 'lucide-react';
const layers = [
  { num: 1, label: 'Analysis Sanity Check', icon: Search },
  { num: 2, label: 'Analysis Sanity Check', icon: BarChart3 },
  { num: 3, label: 'Questionnaire', icon: ClipboardType },
  { num: 4, label: 'Final Strategic Decision', icon: Target },
];

export default function LayerIndicator({ currentLayer, status }) {
  return (
    <div className="flex items-center gap-0 w-full max-w-xl mx-auto">
      {layers.map(({ num, label, icon: Icon }, idx) => {
        const isActive = currentLayer === num;
        const isComplete = currentLayer > num || status === 'completed';
        const isPending = currentLayer < num && status !== 'completed';

        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isComplete ? 'bg-green-50' : isActive ? 'ring-2 ring-offset-2' : 'bg-gray-50'
                }`}
                style={
                  isActive
                    ? { background: '#1B2A4A', ringColor: '#1B2A4A' }
                    : isComplete
                    ? {}
                    : {}
                }
              >
                {isComplete ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : isActive && status === 'running' ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Icon
                    className="w-5 h-5"
                    style={{ color: isActive ? 'white' : isPending ? '#9B9B9B' : '#1B2A4A' }}
                  />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-sans font-medium text-center ${
                  isActive ? 'font-semibold' : isPending ? 'text-gray-400' : 'text-gray-600'
                }`}
                style={isActive ? { color: '#1B2A4A' } : {}}
              >
                {label}
              </span>
            </div>
            {idx < layers.length - 1 && (
              <div className="flex-shrink-0 w-16 h-px mt-[-18px]" style={{
                background: isComplete || (isActive && idx === 0) ? '#1B2A4A' : '#E5E5E5'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}