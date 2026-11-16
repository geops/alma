export default function MarkerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="26"
      viewBox="0 0 24 26"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11 14.2a3.68 3.68 0 0 0 3.75-3.6C14.75 8.61 13.07 7 11 7a3.68 3.68 0 0 0-3.75 3.6c0 1.99 1.68 3.6 3.75 3.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <path
        d="M11 25c5-4.8 10-9.1 10-14.4C21 5.3 16.52 1 11 1S1 5.3 1 10.6 6 20.2 11 25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}
