import { useWirex } from "@/hooks/useWirex";
import { Footer } from "./footer";
import { LogoutButton } from "./logout";
import Image from "next/image";
import { issueVirtualCard } from "@/actions/wirex";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { useEffect } from "react";

export function Dashboard() {
  const { virtualCards, wirexUser } = useWirex();

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
            <h2 className="text-xl font-semibold">Home</h2>
            <LogoutButton />
          </div>

          <>
            {/* TODO: Add cards and features for onboarded Wirex users */}
            <div className="text-center py-8 text-gray-600">
              <p>Welcome! Your Wirex cards and features will appear here.</p>
            </div>

            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                if (!wirexUser?.email) {
                  console.error("User email not found");
                  return;
                }
                issueVirtualCard(
                  wirexUser.email,
                  wirexUser.personal_info.first_name +
                    " " +
                    wirexUser.personal_info.last_name
                );
              }}
              disabled={!wirexUser?.email}
            >
              Create Virtual Card
            </button>

            {virtualCards && (
              <div className="text-center py-8 text-gray-600">
                <p>Virtual cards:</p>
                <pre>{JSON.stringify(virtualCards, null, 2)}</pre>
              </div>
            )}
          </>
        </div>
      </div>
      <Footer />
    </div>
  );
}
