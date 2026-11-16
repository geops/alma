export default function AlertTriangleIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 7.5v3.33m0 3.34h0M8.86 3.24 1.99 15.08c-.38.66-.57.99-.54 1.26.02.23.15.45.34.58.22.16.6.16 1.36.16h13.7c.76 0 1.14 0 1.36-.16.2-.14.32-.35.34-.58.03-.27-.16-.6-.54-1.26L11.15 3.24c-.38-.65-.56-.98-.81-1.09a.83.83 0 0 0-.68 0c-.25.11-.44.44-.81 1.1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
