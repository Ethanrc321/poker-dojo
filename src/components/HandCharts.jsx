import { useState } from 'react';
import HandMatrix from './HandMatrix.jsx';
import { RFI_RANGES, BB_DEFENSE, THREE_BET_RANGES, FOUR_BET_RANGES, POSITION_LABELS } from '../data/ranges.js';
import { POT_ODDS_TABLE, MDF_TABLE } from '../data/scenarios.js';

const VIEWS = [
  { id: 'rfi',       label: 'RFI Ranges' },
  { id: 'bbdefense', label: 'BB Defense' },
  { id: 'threebet',  label: '3-Bet Ranges' },
  { id: 'fourbet',   label: '4-Bet Ranges' },
  { id: 'math',      label: 'Math Tables' },
];

const RFI_POSITIONS = ['UTG','HJ','CO','BTN','SB'];
const BB_OPENERS    = ['UTG','HJ','CO','BTN','SB'];

const THREE_BET_VIEWS = [
  { id: 'SB_vs_any',   label: 'SB vs Any Open' },
  { id: 'BTN_vs_any',  label: 'BTN vs Any Open' },
  { id: 'CO_vs_early', label: 'CO vs UTG/HJ' },
  { id: 'HJ_vs_UTG',   label: 'HJ vs UTG' },
];

function SPRTable() {
  const rows = [
    ['< 1',  'Committed — all-in near-inevitable', 'Any top pair or better'],
    ['1–3',  'Low SPR — limited multi-street play', 'Top Pair Top Kicker (TPTK) or better'],
    ['3–6',  'Medium SPR — standard cash game postflop', 'Two pair or better to stack off'],
    ['6–13', 'High SPR — implied odds matter', 'Sets, straights, flushes to stack off'],
    ['> 13', 'Very deep — speculative hands thrive', 'Nutted hands only to stack off'],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3 text-gray-400">SPR</th>
            <th className="text-left py-2 px-3 text-gray-400">Meaning</th>
            <th className="text-left py-2 px-3 text-gray-400">Stack-Off Threshold</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([spr, meaning, threshold]) => (
            <tr key={spr} className="border-b border-gray-800 hover:bg-gray-800/30">
              <td className="py-2 px-3 font-bold text-amber-400">{spr}</td>
              <td className="py-2 px-3 text-gray-300">{meaning}</td>
              <td className="py-2 px-3 text-green-300">{threshold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MathTable({ data, columns, title }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-300 mb-2">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {columns.map(c => (
                <th key={c.key} className="text-left py-2 px-3 text-gray-400">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                {columns.map(c => (
                  <td key={c.key} className={`py-2 px-3 ${c.color || 'text-gray-300'}`}>
                    {typeof row[c.key] === 'number' ? row[c.key] + '%' : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HandCharts() {
  const [view, setView]   = useState('rfi');
  const [rfiPos, setRfiPos] = useState('BTN');
  const [bbVs, setBbVs]   = useState('BTN');
  const [tbView, setTbView] = useState('SB_vs_any');

  const rfi = RFI_RANGES[rfiPos];
  const bbDef = BB_DEFENSE[bbVs];
  const tbRange = THREE_BET_RANGES[tbView];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Hand Range Charts</h1>
        <p className="text-gray-400 text-sm mt-1">
          GTO-calibrated ranges for 6-max, 100bb. Green = Raise · Amber = Mix (~50%) · Blue = Call · Gray = Fold
        </p>
      </div>

      {/* View selector */}
      <div className="flex flex-wrap gap-2">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === v.id ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── RFI Ranges ── */}
      {view === 'rfi' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {RFI_POSITIONS.map(p => (
              <button
                key={p}
                onClick={() => setRfiPos(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  rfiPos === p ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="panel">
            <HandMatrix
              raiseSet={rfi.raise}
              mixSet={rfi.mix}
              title={`${rfiPos} — ${POSITION_LABELS[rfiPos]} — Raise First In`}
              subtitle={`Open raise to 2.5bb. ${rfiPos === 'SB' ? 'Use 3bb from SB.' : 'Standard sizing from all positions.'}`}
            />
          </div>
          <div className="panel text-sm space-y-2 text-gray-300">
            <h4 className="font-bold text-white">Position Strategy Notes</h4>
            {rfiPos === 'UTG' && <p>UTG acts first with 5 players behind. Only open hands that can withstand 3-bets and play profitably multiway. Focus on premium pairs (66+), strong aces, and suited broadways. Open range: ~17%.</p>}
            {rfiPos === 'HJ'  && <p>HJ has 4 players behind. Slightly wider than UTG — add medium pairs, more suited connectors, and KTo/QTo. Open range: ~21%.</p>}
            {rfiPos === 'CO'  && <p>CO has only BTN and blinds behind. Significant range expansion — add most suited holdings, weaker offsuit aces, and connected low cards. Open range: ~27–28%.</p>}
            {rfiPos === 'BTN' && <p>BTN is the most profitable seat. Only SB and BB remain. Open ~43–45% of hands. Attack the blinds aggressively with suited hands, low connectors, and many offsuit holdings. BTN range is the gold standard for value extraction.</p>}
            {rfiPos === 'SB'  && <p>SB only faces BB. Open ~35–40% and use 3bb open (not 2.5bb) to deny BB a favorable price. SB is always OOP postflop, so defend your range with discipline. Avoid limping — use 3-bet or fold strategy vs BTN opens.</p>}
          </div>
        </div>
      )}

      {/* ── BB Defense ── */}
      {view === 'bbdefense' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {BB_OPENERS.map(p => (
              <button
                key={p}
                onClick={() => setBbVs(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  bbVs === p ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                vs {p}
              </button>
            ))}
          </div>
          <div className="panel">
            <HandMatrix
              raiseSet={bbDef.threebet}
              mixSet={null}
              callSet={bbDef.call}
              title={`BB vs ${bbVs} Open — Defense Range`}
              subtitle="BB defends very wide due to 1bb already invested. Green = 3-bet · Blue = Call · Gray = Fold"
            />
          </div>
          <div className="panel text-sm text-gray-300 space-y-2">
            <h4 className="font-bold text-white">BB Defense Principles</h4>
            <p>BB is the most unique preflop position — already invested 1bb, acting last preflop, first postflop. This creates a wide calling range to realize equity.</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li>vs UTG: defend ~35–40% (tight opener, respect the range)</li>
              <li>vs BTN: defend ~50–55% (BTN opens 43%, so you can call very wide)</li>
              <li>vs SB: defend ~55–60% (you have positional advantage postflop!)</li>
              <li>3-bet value: AA, KK, QQ, AKs, AKo — always 3-bet these</li>
              <li>3-bet bluffs: A5s, A4s, A3s (blocker combos) — especially vs BTN/SB</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── 3-Bet Ranges ── */}
      {view === 'threebet' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {THREE_BET_VIEWS.map(v => (
              <button
                key={v.id}
                onClick={() => setTbView(v.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  tbView === v.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="panel">
            <HandMatrix
              raiseSet={new Set([...tbRange.value, ...(tbRange.bluff || [])])}
              mixSet={tbRange.call || null}
              title={`3-Bet Range: ${THREE_BET_VIEWS.find(v=>v.id===tbView)?.label}`}
              subtitle="Green = 3-bet (value + bluff) · Amber = Flat call (BTN only)"
            />
          </div>
          <div className="panel text-sm text-gray-300 space-y-3">
            <h4 className="font-bold text-white">3-Bet Strategy</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold text-green-300 mb-1">Value 3-Bets</div>
                <ul className="list-disc pl-4 space-y-0.5 text-gray-400">
                  {[...tbRange.value].slice(0,10).map(h => <li key={h}>{h}</li>)}
                </ul>
              </div>
              {tbRange.bluff && (
                <div>
                  <div className="font-semibold text-amber-300 mb-1">Bluff / Semi-Bluff 3-Bets</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-gray-400">
                    {[...tbRange.bluff].slice(0,10).map(h => <li key={h}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="bg-gray-800/50 rounded p-3">
              <div className="font-semibold text-blue-300 mb-1">3-Bet Sizing</div>
              <p className="text-gray-400">In position (BTN/CO): ~3× the open = 7.5–8.5bb vs 2.5bb open</p>
              <p className="text-gray-400">Out of position (SB/BB): ~4× the open = 10–11bb vs 2.5bb open</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 4-Bet ── */}
      {view === 'fourbet' && (
        <div className="space-y-4">
          <div className="panel">
            <HandMatrix
              raiseSet={FOUR_BET_RANGES.value}
              mixSet={FOUR_BET_RANGES.bluff}
              title="4-Bet Ranges (all positions)"
              subtitle="Green = value 4-bet · Amber = 4-bet bluff"
            />
          </div>
          <div className="panel text-sm text-gray-300 space-y-3">
            <h4 className="font-bold text-white">4-Bet Strategy</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold text-green-300 mb-1">4-Bet Sizing</div>
                <p className="text-gray-400">IP: ~20–22bb (2.3–2.5× the 3-bet)</p>
                <p className="text-gray-400">OOP: ~25–28bb (2.5–2.75× the 3-bet)</p>
              </div>
              <div>
                <div className="font-semibold text-amber-300 mb-1">Why 4-Bet A5s?</div>
                <p className="text-gray-400">A5s blocks AA combos (ace blocker) while retaining equity when called (nut flush draw, wheel straight). The ideal polar bluff.</p>
              </div>
            </div>
            <div>
              <div className="font-semibold text-blue-300 mb-1">Calling a 3-Bet (IP only)</div>
              <p className="text-gray-400">TT–66, AQs, KQs, AJs, QJs, JTs, T9s: flat-call in position vs 3-bet. OOP players should 4-bet or fold (rarely call 3-bets OOP).</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Math Tables ── */}
      {view === 'math' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="panel">
              <MathTable
                title="Pot Odds (Equity Needed to Call)"
                data={POT_ODDS_TABLE.map(r => ({ bet: r.betPct + '% pot', equity: r.oddsRequired }))}
                columns={[
                  { key: 'bet',    label: 'Bet Size',       color: 'text-amber-400' },
                  { key: 'equity', label: 'Min Equity Needed', color: 'text-green-400' },
                ]}
              />
              <p className="text-xs text-gray-500 mt-2">Formula: Call ÷ (Call + Total Pot After Call)</p>
            </div>
            <div className="panel">
              <MathTable
                title="Minimum Defense Frequency (MDF)"
                data={MDF_TABLE.map(r => ({ bet: r.betPct + '% pot', mdf: r.mdf }))}
                columns={[
                  { key: 'bet', label: 'Bet Size',  color: 'text-amber-400' },
                  { key: 'mdf', label: 'Must Defend', color: 'text-blue-400' },
                ]}
              />
              <p className="text-xs text-gray-500 mt-2">Formula: Pot ÷ (Pot + Bet)</p>
            </div>
          </div>

          <div className="panel">
            <MathTable
              title="Alpha — Fold % Needed for Bluff to Profit"
              data={POT_ODDS_TABLE.map(r => ({ bet: r.betPct + '% pot', alpha: (100 - r.oddsRequired).toFixed(1) + '%' }))}
              columns={[
                { key: 'bet',   label: 'Bet Size',          color: 'text-amber-400' },
                { key: 'alpha', label: 'Fold% Needed',       color: 'text-rose-400' },
              ]}
            />
            <p className="text-xs text-gray-500 mt-2">Formula: Bet ÷ (Bet + Pot) · Alpha = 1 − MDF</p>
          </div>

          <div className="panel">
            <h4 className="text-sm font-bold text-gray-300 mb-3">Stack-to-Pot Ratio (SPR) Guide</h4>
            <SPRTable />
            <p className="text-xs text-gray-500 mt-2">Formula: Effective Stack ÷ Flop Pot Size</p>
          </div>

          <div className="panel">
            <h4 className="text-sm font-bold text-gray-300 mb-3">Value-to-Bluff Ratio (River)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-400">River Bet Size</th>
                    <th className="text-left py-2 px-3 text-green-400">Value %</th>
                    <th className="text-left py-2 px-3 text-red-400">Bluff %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['33% pot', '75%', '25%'],
                    ['50% pot', '66.7%', '33.3%'],
                    ['75% pot', '57.1%', '42.9%'],
                    ['100% pot', '50%', '50%'],
                  ].map(([bet, val, bluff]) => (
                    <tr key={bet} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-amber-400">{bet}</td>
                      <td className="py-2 px-3 text-green-300">{val}</td>
                      <td className="py-2 px-3 text-red-300">{bluff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">Your bluff % should equal the pot odds you are laying (opponent's call equity needed).</p>
          </div>
        </div>
      )}
    </div>
  );
}
