"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientAICheckerAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/ai-checker");
  }, [router]);

  return null;
}
