import { useId } from 'react';
import { cn } from '../../utils/cn';

/* Lightweight SVG charts — zero charting dependency, fully responsive. */

interface Series { name: string; color: string; values: number[] }

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

export function AreaChart({ labels, series, height = 220, suffix = '', max }: {
  labels: string[]; series: Series[]; height?: number; suffix?: string; max?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const w = 640;
  const h = height;
  const padL = 34;
  const padB = 26;
  const padT = 12;
  const top = max ?? niceMax(Math.max(...series.flatMap((s) => s.values), 1));
  const innerW = w - padL - 8;
  const innerH = h - padB - padT;
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : innerW;

  const pt = (v: number, i: number) => [padL + i * stepX, padT + innerH - (v / top) * innerH] as const;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.name).join(' vs ')}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`g-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={w - 8} y1={padT + innerH * f} y2={padT + innerH * f} stroke="#eef0f4" strokeWidth="1" />
          <text x={padL - 6} y={padT + innerH * f + 4} textAnchor="end" fontSize="10" fill="#98a3b6">
            {Math.round(top * (1 - f))}{suffix}
          </text>
        </g>
      ))}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => pt(v, i));
        const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${pts[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
        return (
          <g key={si}>
            <path d={area} fill={`url(#g-${uid}-${si})`} />
            <path d={line} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3.2" fill="#fff" stroke={s.color} strokeWidth="2.2">
                <title>{`${s.name} · ${labels[i]}: ${s.values[i]}${suffix}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={padL + i * stepX} y={h - 8} textAnchor="middle" fontSize="10" fill="#98a3b6">{l}</text>
      ))}
    </svg>
  );
}

export function BarChart({ labels, values, color = '#573ec9', height = 200, suffix = '' }: {
  labels: string[]; values: number[]; color?: string; height?: number; suffix?: string;
}) {
  const w = 640;
  const padL = 34;
  const padB = 26;
  const padT = 10;
  const top = niceMax(Math.max(...values, 1));
  const innerH = height - padB - padT;
  const innerW = w - padL - 8;
  const slot = innerW / Math.max(labels.length, 1);
  const bw = Math.min(46, slot * 0.56);

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label="Bar chart">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={w - 8} y1={padT + innerH * f} y2={padT + innerH * f} stroke="#eef0f4" />
          <text x={padL - 6} y={padT + innerH * f + 4} textAnchor="end" fontSize="10" fill="#98a3b6">{Math.round(top * (1 - f))}</text>
        </g>
      ))}
      {values.map((v, i) => {
        const bh = Math.max(2, (v / top) * innerH);
        const x = padL + i * slot + (slot - bw) / 2;
        return (
          <g key={i}>
            <rect x={x} y={padT + innerH - bh} width={bw} height={bh} rx="6" fill={color} opacity="0.92">
              <title>{`${labels[i]}: ${v}${suffix}`}</title>
            </rect>
            <text x={x + bw / 2} y={padT + innerH - bh - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="#525d72">{v}</text>
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={padL + i * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#98a3b6">{l}</text>
      ))}
    </svg>
  );
}

export function DonutChart({ segments, size = 190, thickness = 22, centerLabel, centerValue }: {
  segments: { label: string; value: number; color: string }[]; size?: number; thickness?: number;
  centerLabel?: string; centerValue?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Distribution chart">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f4" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        {centerValue && (
          <>
            <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a1e28">{centerValue}</text>
            <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize="10" fill="#98a3b6">{centerLabel}</text>
          </>
        )}
      </svg>
      <ul className="min-w-32 flex-1 space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-ink-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="font-semibold text-ink-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBarList({ items, suffix = '%' }: { items: { label: string; value: number; meta?: string; tone?: string }[]; suffix?: string }) {
  return (
    <ul className="space-y-3.5">
      {items.map((it) => {
        const tone = it.tone ?? (it.value >= 75 ? '#10b981' : it.value >= 55 ? '#573ec9' : it.value >= 40 ? '#f59e0b' : '#f43f5e');
        return (
          <li key={it.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-semibold text-ink-800">{it.label}</span>
              <span className="shrink-0 text-xs font-bold text-ink-900">
                {Math.round(it.value)}{suffix}
                {it.meta && <span className="ml-2 font-medium text-ink-400">{it.meta}</span>}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, Math.min(100, it.value))}%`, background: tone }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Sparkline({ values, color = '#573ec9', height = 44 }: { values: number[]; color?: string; height?: number }) {
  const w = 160;
  const top = Math.max(...values, 1);
  const bottom = Math.min(...values, 0);
  const range = top - bottom || 1;
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${height - ((v - bottom) / range) * height}`);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className={cn('h-auto w-full')} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
