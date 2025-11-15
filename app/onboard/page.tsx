"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
import { LogoutButton } from "@/components/logout";
import { WirexOnboardFlow } from "@/components/wirex-onboard-flow";
import { useWirex } from "@/hooks/useWirex";

export default function OnboardPage() {
  const router = useRouter();
  const { currentStep } = useWirex();

  useEffect(() => {
    if (currentStep === "completed") {
      router.push("/");
    }
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-gray-50 content-center">
      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:pt-8">
        <div className="flex flex-col mb-6 max-sm:items-center">
          <Image
            src="/crossmint.svg"
            alt="Crossmint logo"
            priority
            width={150}
            height={150}
            className="mb-4"
          />
          <h1 className="text-2xl font-semibold mb-2">
            Wirex x Crossmint Demo
          </h1>
          <p className="text-gray-600 text-sm">
            Create and interact with Crossmint wallets and Wirex
          </p>
        </div>

        {/* Dashboard Header */}
        <div className="flex flex-col gap-4 bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Dashboard</h2>
            <LogoutButton />
          </div>

          <WirexOnboardFlow />
        </div>
      </div>
      <Footer />
    </div>
  );
}
