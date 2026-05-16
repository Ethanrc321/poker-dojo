import { RANKS } from '../data/ranges.js';

// Generate hand key from grid position
function gridToHand(row, col) {
  if (row === col) return RANKS[row] + RANKS[col];
  if (row < col)  return RANKS[row] + RANKS[col] + 's';
  return RANKS[col] + RANKS[row] + 'o';
}

// Get action for a hand given raise and mix sets (and optional call set for BB)
function getAction(hand, raiseSet, mixSet, callSet = null) {
  if (raiseSet && raiseSet.has(hand)) return 'raise';
  if (mixSet   && mixSet.has(hand))   return 'mix';
  if (callSet  && callSet.has(hand))  return 'call';
  return 'fold';
}

const ACTION_STYLES = {
  raise: 'bg-green-700 hover:bg-green-600 text-white',
  mix:   'bg-amber-600 hover:bg-amber-500 text-white',
  call:  'bg-blue-700 hover:bg-blue-600 text-white',
  fold:  'bg-gray-800 hover:bg-gray-700 text-gray-500',
};

const ACTION_LABELS = {
  raise: 'Raise',
  mix:   'Mix',
  call:  'Call',
  fold:  'Fold',
};

const LEGEND = [
  { action: 'raise', label: 'Raise',  style: 'bg-green-700 text-white' },
  { action: 'mix',   label: 'Mix ~50%', style: 'bg-amber-600 text-white' },
  { action: 'call',  label: 'Call',   style: 'bg-blue-700 text-white' },
  { action: 'fold',  label: 'Fold',   style: 'bg-gray-800 text-gray-400' },
];

export default function HandMatrix({ raiseSet, mixSet, callSet, title, subtitle }) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-base font-bold text-white">{title}</h3>}
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {LEGEND.map(l => (
          (l.action === 'call' && !callSet) ? null : (
            <span key={l.action} className={`text-xs px-2 py-0.5 rounded font-medium ${l.style}`}>
              {l.label}
            </span>
          )
        ))}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex">
            <div className="w-5 h-5" /> {/* Corner spacer */}
            {RANKS.map(r => (
              <div key={r} className="w-[30px] h-5 text-center text-xs text-gray-500 font-medium leading-5">
                {r}
              </div>
            ))}
          </div>

          {RANKS.map((rowRank, row) => (
            <div key={rowRank} className="flex items-center">
              {/* Row header */}
              <div className="w-5 text-xs text-gray-500 font-medium text-center leading-[30px]">
                {rowRank}
              </div>
              {RANKS.map((_, col) => {
                const hand = gridToHand(row, col);
                const action = getAction(hand, raiseSet, mixSet, callSet);
                const label = row === col
                  ? RANKS[row] + RANKS[row]  // pair: AA, KK...
                  : row < col
                    ? RANKS[row] + RANKS[col] + 's'  // suited
                    : RANKS[col] + RANKS[row] + 'o'; // offsuit

                return (
                  <div
                    key={col}
                    title={`${label}: ${ACTION_LABELS[action]}`}
                    className={`w-[30px] h-[30px] m-[1px] rounded-sm text-[9px] font-bold flex items-center justify-center
                                cursor-default transition-colors ${ACTION_STYLES[action]}`}
                  >
                    {label.length <= 3 ? label : label.slice(0,2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {raiseSet && (
        <div className="text-xs text-gray-500">
          {raiseSet.size} raise hands · {mixSet?.size || 0} mix hands
          {callSet ? ` · ${callSet.size} call hands` : ''}
        </div>
      )}
    </div>
  );
}
