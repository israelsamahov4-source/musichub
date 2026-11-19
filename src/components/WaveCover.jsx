/** The default cover: brand blue with a few sound-wave lines drawn across it. */
export default function WaveCover({ className = "" }) {
  const waves = [0, 1, 2, 3, 4].map((i) => {
    const y = 40 + i * 22, a = 10 + i * 4, f = 0.012 + i * 0.002;
    const d = Array.from({ length: 121 }, (_, k) => `${k ? "L" : "M"}${k * 10},${(y + a * Math.sin(k * 10 * f + i)).toFixed(1)}`).join(" ");
    return <path key={i} d={d} fill="none" stroke={i === 2 ? "#FF4F81" : "#fff"} strokeOpacity={i === 2 ? 0.85 : 0.14 + i * 0.03} strokeWidth={i === 2 ? 2.5 : 1.5} vectorEffect="non-scaling-stroke" />;
  });
  return (
    <div className={`relative overflow-hidden bg-riso-blue ${className}`} aria-hidden>
      <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">{waves}</svg>
    </div>
  );
}
