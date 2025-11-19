"use client";

import { useEffect, useRef } from "react";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard";
import { useRouter } from "next/navigation";
import { useWirex } from "@/hooks/useWirex";

export default function Home() {
  const router = useRouter();
  const { isApproved, isCheckingStatus } = useWirex();
  const { status: authStatus } = useAuth();
  const nodeRef = useRef(null);

  console.log("isCheckingStatus", isCheckingStatus);
  console.log("isApproved", isApproved);
  useEffect(() => {
    if (isCheckingStatus) return;
    if (!isApproved) {
      router.push("/onboard");
    }
  }, [isApproved, isCheckingStatus]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <SwitchTransition mode="out-in">
          <CSSTransition
            key={authStatus === "logged-in" ? "dashboard" : "landing"}
            nodeRef={nodeRef}
            timeout={400}
            classNames="page-transition"
            unmountOnExit
          >
            <div ref={nodeRef}>
              {authStatus === "logged-in" ? (
                <Dashboard />
              ) : (
                <LandingPage isLoading={authStatus === "initializing"} />
              )}
            </div>
          </CSSTransition>
        </SwitchTransition>
      </main>
    </div>
  );
}
