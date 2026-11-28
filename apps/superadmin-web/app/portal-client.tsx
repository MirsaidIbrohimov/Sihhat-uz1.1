"use client";

import dynamic from "next/dynamic";

export const DynamicPortal = dynamic(
  () => import("@sihhat/ui").then((mod) => mod.Portal),
);
