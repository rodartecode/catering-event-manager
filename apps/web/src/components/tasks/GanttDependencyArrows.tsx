import type { GanttArrow } from '@/lib/gantt-layout';

interface GanttDependencyArrowsProps {
  arrows: GanttArrow[];
  width: number;
  height: number;
}

export function GanttDependencyArrows({ arrows, width, height }: GanttDependencyArrowsProps) {
  if (arrows.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      aria-hidden="true"
    >
      <defs>
        <marker
          id="gantt-arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" className="fill-gray-400" />
        </marker>
        <marker
          id="gantt-arrowhead-critical"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" className="fill-amber-500" />
        </marker>
      </defs>
      {arrows.map((arrow) => {
        const midX = (arrow.fromX + arrow.toX) / 2;
        const d = `M ${arrow.fromX} ${arrow.fromY} C ${midX} ${arrow.fromY}, ${midX} ${arrow.toY}, ${arrow.toX} ${arrow.toY}`;
        return (
          <path
            key={`${arrow.fromId}-${arrow.toId}`}
            d={d}
            fill="none"
            className={arrow.isCriticalPath ? 'stroke-amber-500' : 'stroke-gray-300'}
            strokeWidth={arrow.isCriticalPath ? 2 : 1.5}
            markerEnd={
              arrow.isCriticalPath ? 'url(#gantt-arrowhead-critical)' : 'url(#gantt-arrowhead)'
            }
          />
        );
      })}
    </svg>
  );
}
