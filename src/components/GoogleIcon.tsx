import type { SVGProps } from 'react';

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.85-1.7 2.9-4.2 2.9-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.65 0 4.88-.87 6.5-2.36l-3.15-2.45c-.87.58-1.98.92-3.35.92-2.57 0-4.75-1.73-5.53-4.06H3.22v2.53A9.81 9.81 0 0 0 12 21.5Z"
      />
      <path
        fill="#FBBC05"
        d="M6.47 13.55a5.9 5.9 0 0 1 0-3.1V8.02H3.22a9.5 9.5 0 0 0 0 7.96l3.25-2.43Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.39c1.45 0 2.75.5 3.78 1.48l2.84-2.84C16.88 3.48 14.65 2.5 12 2.5a9.81 9.81 0 0 0-8.78 5.52l3.25 2.43C7.25 8.12 9.43 6.39 12 6.39Z"
      />
    </svg>
  );
}
