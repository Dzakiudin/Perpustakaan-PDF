"use client";

import dynamic from "next/dynamic";

const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), {
  ssr: false,
  loading: () => null,
});

export default function LazyOnboardingTour() {
  return <OnboardingTour />;
}
