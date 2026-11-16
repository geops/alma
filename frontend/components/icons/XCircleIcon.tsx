export default function XCircleIcon(props: { className?: string }) {
  return (
    <svg
      data-test="XCircleIcon"
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="m11.833 7.5-5 5m0-5 5 5m5.834-2.5A8.333 8.333 0 1 1 1 10a8.333 8.333 0 0 1 16.667 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.667"
      />
    </svg>
  );
}
