export default function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="20"
      viewBox="0 0 48 48"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="24"
        cy="24"
        opacity="0.15"
        r="22"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="24"
        cy="24"
        opacity="0.35"
        r="16"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M24 19v5m0 4h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
