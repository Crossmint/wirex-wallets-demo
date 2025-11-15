"use client";

import { useAuth } from "@crossmint/client-sdk-react-ui";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    logout();
    router.push("/");
  };

  return (
    <button
      className="flex items-center gap-2 py-2 px-3 rounded-full text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
      onClick={handleLogout}
    >
      Log out
      <Image src="/log-out.svg" alt="Logout" width={16} height={16} />
    </button>
  );
}
