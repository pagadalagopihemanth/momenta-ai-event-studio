export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`momenta-mark ${className}`}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 25V7L16 19 28 7v18"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}
export function Wordmark() {
  return (
    <span className="momenta-wordmark">
      <BrandMark />
      <span>
        momenta<span className="wordmark-period">.</span>
      </span>
    </span>
  );
}
