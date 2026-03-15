import React from 'react';
import {
  Activity,
  ArrowDown,
  CircleDashed,
  CloudFog,
  Dna,
  Fan,
  Feather,
  Flower2,
  Grid3x3,
  Hexagon,
  Infinity as InfinityIcon,
  List,
  LucideIcon,
  Magnet,
  Mountain,
  MoveUp,
  MoveVertical,
  Orbit,
  RefreshCw,
  ScatterChart,
  Shell,
  Sigma,
  Split,
  Sprout,
  Tornado,
  Waves,
  Wind,
  BoxSelect,
  ChevronsRight,
  Droplets,
  RotateCw,
} from 'lucide-react';
import type { Layer2Type } from '../types';
import { MOTION_GROUPS } from './motionCatalog';

export const MOTION_OPTIONS: { id: Layer2Type; label: string; icon: LucideIcon }[] = [
  { id: 'flow', label: 'Flow', icon: Activity },
  { id: 'wind', label: 'Wind', icon: Wind },
  { id: 'aero', label: 'Aero', icon: Fan },
  { id: 'curl', label: 'Curl', icon: Wind },
  { id: 'noise', label: 'Noise', icon: CloudFog },
  { id: 'ridged_mf', label: 'Ridged', icon: Mountain },
  { id: 'field', label: 'Field', icon: Grid3x3 },
  { id: 'euler', label: 'Euler', icon: Split },
  { id: 'orbit', label: 'Orbit', icon: RotateCw },
  { id: 'spiral_motion', label: 'Spiral', icon: Shell },
  { id: 'helix', label: 'Helix', icon: Dna },
  { id: 'phyllotaxis', label: 'Phyllo', icon: Sprout },
  { id: 'rose_curve', label: 'Rose', icon: Flower2 },
  { id: 'lissajous', label: 'Lissaj', icon: InfinityIcon },
  { id: 'toroidal', label: 'Toroid', icon: Orbit },
  { id: 'pendulum', label: 'Pend', icon: MoveVertical },
  { id: 'lattice', label: 'Lattice', icon: Grid3x3 },
  { id: 'epicycle', label: 'Epicycle', icon: RotateCw },
  { id: 'gyre', label: 'Gyre', icon: Tornado },
  { id: 'crystal', label: 'Crystal', icon: Hexagon },
  { id: 'ripple_ring', label: 'Ripple', icon: Waves },
  { id: 'fold', label: 'Fold', icon: Split },
  { id: 'kaleidoscope', label: 'Kaleido', icon: Flower2 },
  { id: 'braid', label: 'Braid', icon: Dna },
  { id: 'arc_wave', label: 'ArcWave', icon: Waves },
  { id: 'web', label: 'Web', icon: Grid3x3 },
  { id: 'pulse_shell', label: 'Pulse', icon: Shell },
  { id: 'mandala', label: 'Mandala', icon: Flower2 },
  { id: 'ribbon', label: 'Ribbon', icon: Dna },
  { id: 'shear', label: 'Shear', icon: Split },
  { id: 'spokes', label: 'Spokes', icon: RotateCw },
  { id: 'breathing', label: 'Breath', icon: Activity },
  { id: 'torus_knot', label: 'T-Knot', icon: Orbit },
  { id: 'clifford', label: 'Clifford', icon: InfinityIcon },
  { id: 'hopalong', label: 'Hopalong', icon: ScatterChart },
  { id: 'cellular', label: 'Cellular', icon: Grid3x3 },
  { id: 'cyclone', label: 'Cyclone', icon: Tornado },
  { id: 'petals', label: 'Petals', icon: Flower2 },
  { id: 'sheet', label: 'Sheet', icon: BoxSelect },
  { id: 'flare', label: 'Flare', icon: CircleDashed },
  { id: 'moebius', label: 'Moebius', icon: Orbit },
  { id: 'harmonic', label: 'Harmonic', icon: Waves },
  { id: 'starburst', label: 'Star', icon: CircleDashed },
  { id: 'grid_wave', label: 'G-Wave', icon: Grid3x3 },
  { id: 'helio', label: 'Helio', icon: RotateCw },
  { id: 'zigzag', label: 'Zigzag', icon: Split },
  { id: 'shockwave', label: 'Shock', icon: CircleDashed },
  { id: 'filament', label: 'Filament', icon: Feather },
  { id: 'mirror_fold', label: 'Mirror', icon: Split },
  { id: 'radial_steps', label: 'R-Steps', icon: RotateCw },
  { id: 'coil', label: 'Coil', icon: Dna },
  { id: 'labyrinth', label: 'Maze', icon: Grid3x3 },
  { id: 'gyro', label: 'Gyro', icon: RotateCw },
  { id: 'echo_ring', label: 'Echo', icon: Waves },
  { id: 'braidshell', label: 'B-Shell', icon: Dna },
  { id: 'crosscurrent', label: 'Cross', icon: Wind },
  { id: 'prism', label: 'Prism', icon: Hexagon },
  { id: 'tessellate', label: 'Tessel', icon: Grid3x3 },
  { id: 'pulse_grid', label: 'P-Grid', icon: Activity },
  { id: 'tidal', label: 'Tidal', icon: Waves },
  { id: 'beacon', label: 'Beacon', icon: CircleDashed },
  { id: 'caustic', label: 'Caustic', icon: Waves },
  { id: 'pinwheel', label: 'Pinwheel', icon: RotateCw },
  { id: 'nebula', label: 'Nebula', icon: CloudFog },
  { id: 'fronds', label: 'Fronds', icon: Sprout },
  { id: 'gyroflower', label: 'GyroFlwr', icon: Flower2 },
  { id: 'monolith', label: 'Monolith', icon: BoxSelect },
  { id: 'runes', label: 'Runes', icon: Sigma },
  { id: 'fanout', label: 'Fanout', icon: Fan },
  { id: 'eddy', label: 'Eddy', icon: Tornado },
  { id: 'nova', label: 'Nova', icon: CircleDashed },
  { id: 'lorenz', label: 'Lorenz', icon: InfinityIcon },
  { id: 'aizawa', label: 'Aizawa', icon: Sigma },
  { id: 'rossler', label: 'Rössler', icon: Tornado },
  { id: 'thomas', label: 'Thomas', icon: Orbit },
  { id: 'attractor', label: 'Attr', icon: Magnet },
  { id: 'swirl', label: 'Swirl', icon: Tornado },
  { id: 'vortex', label: 'Vortex', icon: RefreshCw },
  { id: 'wave', label: 'Wave', icon: Waves },
  { id: 'morph', label: 'Morph', icon: Hexagon },
  { id: 'liquid', label: 'Liquid', icon: Droplets },
  { id: 'smoke', label: 'Smoke', icon: MoveUp },
  { id: 'gravity', label: 'Gravity', icon: ArrowDown },
  { id: 'spring', label: 'Spring', icon: MoveVertical },
  { id: 'explosion', label: 'Burst', icon: CircleDashed },
  { id: 'linear', label: 'Linear', icon: ChevronsRight },
  { id: 'uniform', label: 'Uniform', icon: BoxSelect },
  { id: 'gaussian', label: 'Gauss', icon: ScatterChart },
  { id: 'brownian', label: 'Brownian', icon: Split },
  { id: 'aux', label: 'Drift', icon: Feather },
];

export const MotionSelector: React.FC<{
  value: Layer2Type;
  onChange: (val: Layer2Type) => void;
}> = ({ value, onChange }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <div className="mb-5">
      <div className="mb-2 text-[10px] uppercase tracking-widest font-medium opacity-70">
        Motion Type
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search motions"
        className="mb-3 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none focus:border-white/35"
      />
      <div className="space-y-3">
        {MOTION_GROUPS.map((group) => {
          const visibleOptions = group.ids
            .map((id) => MOTION_OPTIONS.find((entry) => entry.id === id))
            .filter((option): option is NonNullable<typeof option> => Boolean(option))
            .filter((option) => normalizedQuery.length === 0 || `${option.label} ${option.id} ${group.label}`.toLowerCase().includes(normalizedQuery));

          if (visibleOptions.length === 0) {
            return null;
          }

          return (
            <div key={group.label}>
              <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-white/45">{group.label}</div>
              <div className="grid grid-cols-4 gap-2">
                {visibleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    className={`flex flex-col items-center justify-center py-2 border transition-all duration-200 ${
                      value === opt.id
                        ? 'bg-white text-black border-transparent opacity-100 scale-105 shadow-lg'
                        : 'border-white/20 bg-transparent text-white/60 hover:text-white hover:border-white/50'
                    }`}
                  >
                    <opt.icon size={14} className="mb-1" />
                    <span className="text-[8px] uppercase font-bold text-center leading-none">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PerSourceMotionConfig: React.FC<{
  count: number;
  motions: Layer2Type[];
  onChange: (index: number, val: Layer2Type) => void;
  currentTheme: 'white' | 'black';
}> = ({ count, motions, onChange, currentTheme }) => (
  <div className="mb-5 space-y-2">
    <div className="text-[10px] uppercase tracking-widest font-medium opacity-70 mb-2 flex items-center gap-2">
      <List size={12} /> Configure Motions
    </div>
    {Array.from({ length: Math.min(count, 20) }).map((_, idx) => (
      <div key={idx} className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
        <span className="text-[10px] font-mono opacity-80">Source {idx + 1}</span>
        <select
          value={motions[idx] || 'flow'}
          onChange={(e) => onChange(idx, e.target.value as Layer2Type)}
          className={`text-[10px] uppercase font-bold p-1 rounded border-none outline-none cursor-pointer ${
            currentTheme === 'white' ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          {MOTION_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>
    ))}
  </div>
);
