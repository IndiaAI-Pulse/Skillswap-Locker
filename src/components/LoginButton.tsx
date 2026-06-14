// src/components/LoginButton.tsx
"use client";

import { signIn } from "next-auth/react";

export function LoginButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="w-full flex items-center justify-center gap-3 px-5 py-3 text-sm font-bold text-black bg-white hover:bg-zinc-200 active:scale-[0.98] rounded-xl transition-all duration-200 shadow-lg cursor-pointer"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="#EA4335"
          d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.82 0 3.485.7 4.76 1.84l2.42-2.42C17.475 1.7 15.01 0 12.24 0 6.132 0 1.14 4.992 1.14 11s4.992 11 11.1 11c5.734 0 10.396-4.502 10.396-11 0-.672-.06-1.316-.172-1.715H12.24z"
        />
      </svg>
      Continue with Google
    </button>
  );
}