"use client";

import { useRef } from "react";
import { useAuth } from "@crossmint/client-sdk-react-ui";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const { status: authStatus } = useAuth();
  const nodeRef = useRef(null);

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
