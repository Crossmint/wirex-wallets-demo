import { useWirex } from "@/hooks/useWirex";
import { Footer } from "./footer";
import { LogoutButton } from "./logout";
import Image from "next/image";
import { WirexOnboardFlow } from "./wirex-onboard-flow";
import { WirexDashboard } from "./wirex-dashboard";

export function Dashboard() {
  const { isApproved, isCheckingStatus } = useWirex();

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
            <h2 className="text-xl font-semibold">
              {!isCheckingStatus && !isApproved ? "Onboarding" : "Home"}
            </h2>
            <LogoutButton />
          </div>

          {/* Show onboard flow if not approved, otherwise show dashboard content */}
          {!isCheckingStatus && !isApproved ? (
            <WirexOnboardFlow />
          ) : (
            <WirexDashboard />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
