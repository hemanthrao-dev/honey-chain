export default function HoneycombLogo({ className = "w-10 h-10" }) {
  // Hexagon helper: creates a regular hexagon path centered at (cx, cy) with given size
  const hexagon = (cx, cy, size) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6; // Start from top vertex
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };

  const size = 20; // Hexagon radius for middle row
  const smallSize = 16; // Top hexagon size

  return (
    <svg
      viewBox="0 0 120 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top hexagon (small, centered) */}
      <polygon
        points={hexagon(60, 25, smallSize)}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left hexagon (middle row) */}
      <polygon
        points={hexagon(35, 55, size)}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center hexagon (middle row, slightly higher) */}
      <polygon
        points={hexagon(60, 48, size)}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right hexagon (middle row) */}
      <polygon
        points={hexagon(85, 55, size)}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom hexagon with pointed tail */}
      <path
        d="M 60,75
           L 77.32,85
           L 77.32,105
           L 60,115
           L 42.68,105
           L 42.68,85
           Z
           M 60,115
           L 60,130"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
