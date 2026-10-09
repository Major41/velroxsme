"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function UnitsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/products/categories");
  }, [router]);

  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
    </div>
  );
}