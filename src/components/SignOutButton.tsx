"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      // 🌟 Pehle yahan "/login" tha, use hata kar sirf "/" (root path) kar do
      onClick={() => signOut({ callbackUrl: "/" })} 
      className="w-full px-4 py-2.5 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700/50 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
    >
      Sign out
    </button>
  );
}