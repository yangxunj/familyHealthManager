import { useRef, useEffect, useCallback } from 'react';

interface ScrollNumberPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  /** Number of visible rows (must be odd). Default 5. */
  visibleCount?: number;
}

const ITEM_HEIGHT = 40;

export default function ScrollNumberPicker({
  min,
  max,
  value,
  onChange,
  step = 1,
  suffix,
  visibleCount = 5,
}: ScrollNumberPickerProps) {
  const pickerHeight = ITEM_HEIGHT * visibleCount;
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Generate number list
  const numbers: number[] = [];
  for (let i = min; i <= max; i += step) {
    numbers.push(i);
  }

  const padCount = Math.floor(visibleCount / 2);

  const scrollToIndex = useCallback(
    (index: number, smooth = false) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [],
  );

  // Initialize scroll position
  useEffect(() => {
    const idx = numbers.indexOf(value);
    if (idx >= 0) {
      requestAnimationFrame(() => scrollToIndex(idx, false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (isScrollingRef.current) return;
    const idx = numbers.indexOf(value);
    if (idx >= 0) {
      scrollToIndex(idx, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const scrollTop = el.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, numbers.length - 1));

      scrollToIndex(clamped, true);

      const newValue = numbers[clamped];
      if (newValue !== undefined && newValue !== value) {
        onChange(newValue);
      }
      isScrollingRef.current = false;
    }, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numbers, value, onChange, scrollToIndex]);

  return (
    <div
      style={{
        position: 'relative',
        height: pickerHeight,
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Scroll container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          height: pickerHeight,
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }} />
        ))}

        {numbers.map((num) => {
          const isActive = num === value;
          return (
            <div
              key={num}
              style={{
                height: ITEM_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'center',
                fontSize: isActive ? 26 : 16,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? '#136dec' : 'rgba(0,0,0,0.25)',
                transition: 'font-size 0.15s, color 0.15s, font-weight 0.15s',
              }}
            >
              {num}
            </div>
          );
        })}

        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-bot-${i}`} style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }} />
        ))}
      </div>

      {/* Suffix label */}
      {suffix && (
        <div
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 12,
            color: 'rgba(0,0,0,0.45)',
            pointerEvents: 'none',
          }}
        >
          {suffix}
        </div>
      )}

      {/* Highlight band */}
      <div
        style={{
          position: 'absolute',
          top: padCount * ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          borderTop: '2px solid #136dec',
          borderBottom: '2px solid #136dec',
          background: 'rgba(19, 109, 236, 0.04)',
          pointerEvents: 'none',
          borderRadius: 4,
        }}
      />

      {/* Fade masks */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: padCount * ITEM_HEIGHT,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0))',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: padCount * ITEM_HEIGHT,
          background: 'linear-gradient(to top, rgba(255,255,255,0.9), rgba(255,255,255,0))',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        div[style*="overflowY: auto"]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
