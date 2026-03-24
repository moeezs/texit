export function Logo({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="15" y="15" width="70" height="70" rx="14" />
        <polyline points="70,28 30,28 50,50 30,72 70,72" />
      </g>
    </svg>
  );
}
