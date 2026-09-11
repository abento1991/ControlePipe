"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Small helper to read/write URL search params (all list filters live in the URL so views are shareable). */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = useCallback(
    (updates: Record<string, string | string[] | null | undefined>, opts: { resetPage?: boolean; replace?: boolean } = { resetPage: true }) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || (Array.isArray(v) && v.length === 0) || v === "") next.delete(k);
        else next.set(k, Array.isArray(v) ? v.join(",") : v);
      }
      if (opts.resetPage !== false) next.delete("page");
      const url = `${pathname}${next.toString() ? `?${next}` : ""}`;
      if (opts.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, pathname, sp],
  );

  const get = useCallback((k: string) => sp.get(k), [sp]);
  const getList = useCallback((k: string) => (sp.get(k) ? sp.get(k)!.split(",").filter(Boolean) : []), [sp]);
  const replaceAll = useCallback(
    (params: URLSearchParams) => {
      router.push(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
    },
    [router, pathname],
  );
  return { sp, get, getList, set, replaceAll, pathname };
}
