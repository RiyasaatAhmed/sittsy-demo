import { Skeleton } from "@/components/Skeleton/Skeleton";
import { SitterListSkeleton } from "../SitterListSkeleton/SitterListSkeleton";
import { TopBar } from "@/components/TopBar/TopBar";

/**
 * Shown while the page reads the search from the URL (the Suspense fallback
 * that Next.js asks for around useSearchParams). Same shape as the page.
 */
export function PlaygroundSkeleton() {
  return (
    <div aria-busy="true">
      <TopBar>
        <Skeleton width={690} height={66} round={false} />
      </TopBar>
      <SitterListSkeleton slow={false} />
    </div>
  );
}
