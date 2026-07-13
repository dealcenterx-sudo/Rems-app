import React, { useEffect, useState } from 'react';

// Skeleton is a decorative loading placeholder. It reuses the existing `shimmer`
// keyframe (src/App.css) and references design tokens directly per RC-02:
// base fill var(--surface-2) with a var(--skeleton-highlight) sweep (NOT the
// legacy var(--surface-1)). Each composed shape reserves the exact height/width of the
// real content it replaces so there is no layout shift on swap-in (D-10).

const SHIMMER_GRADIENT =
  'linear-gradient(90deg, var(--surface-2) 25%, var(--skeleton-highlight) 50%, var(--surface-2) 75%)';

/** Tracks the user's prefers-reduced-motion setting so the sweep can be disabled. */
const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event) => setReduced(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
};

/**
 * Base shimmer block. Decorative (`aria-hidden`); the page's own aria-live/role
 * status affordance is what screen readers announce.
 */
export const Skeleton = ({
  width = '100%',
  height = 12,
  radius = 'var(--radius-sm)',
  style,
  ...props
} = {}) => {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      aria-hidden="true"
      {...props}
      style={{
        width,
        height,
        borderRadius: radius,
        // Reduced motion: static base fill, no moving sweep.
        background: reduced ? 'var(--surface-2)' : SHIMMER_GRADIENT,
        backgroundSize: '200% 100%',
        animation: reduced ? 'none' : 'shimmer 1.2s linear infinite',
        ...style,
      }}
    />
  );
};

/** A stack of text lines; the final line is shorter to mimic a paragraph. */
export const SkeletonText = ({
  lines = 3,
  lastWidth = '60%',
  gap = 'var(--space-2)',
  style,
  ...props
} = {}) => (
  <div aria-hidden="true" style={style} {...props}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={12}
        width={i === lines - 1 ? lastWidth : '100%'}
        style={{ marginBottom: i === lines - 1 ? 0 : gap }}
      />
    ))}
  </div>
);

/** A card-sized block matching the height of a real content card. */
export const SkeletonCard = ({ height = 120, style, ...props } = {}) => (
  <Skeleton
    height={height}
    radius="var(--radius-md)"
    style={{ marginBottom: 'var(--space-4)', ...style }}
    {...props}
  />
);

/** A horizontal row of cells sized to reserve a table row's footprint. */
export const SkeletonTableRow = ({
  columns = 4,
  height = 44,
  gap = 'var(--space-3)',
  style,
  ...props
} = {}) => (
  <div
    aria-hidden="true"
    style={{ display: 'flex', alignItems: 'center', gap, height, ...style }}
    {...props}
  >
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton key={i} height={12} width={`${Math.round(100 / columns)}%`} />
    ))}
  </div>
);

/** A KPI tile placeholder (label line + value block), sized like a real tile. */
export const SkeletonKpiTile = ({ style, ...props } = {}) => (
  <div
    aria-hidden="true"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: 'var(--space-4)',
      minHeight: 96,
      ...style,
    }}
    {...props}
  >
    <Skeleton height={12} width="40%" />
    <Skeleton height={28} width="60%" radius="var(--radius-md)" />
  </div>
);

export default Skeleton;
