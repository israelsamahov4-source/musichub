/** The mark: an equaliser of three bars on a blue tile, with a pink "live" dot. */
export default function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#2F45C2" />
      <rect x="8.5" y="13" width="3.4" height="11" rx="1.7" fill="#fff" />
      <rect x="14.3" y="8" width="3.4" height="16" rx="1.7" fill="#fff" />
      <rect x="20.1" y="16" width="3.4" height="8" rx="1.7" fill="#fff" />
      <circle cx="21.8" cy="10.6" r="2.4" fill="#FF4F81" />
    </svg>
  );
}
