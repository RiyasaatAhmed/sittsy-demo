import { Suspense } from "react";
import { PlaygroundSkeleton } from "@/features/sitter-search/components/PlaygroundSkeleton/PlaygroundSkeleton";
import { SearchPage } from "./_components/SearchPage/SearchPage";

export default function Home() {
  return (
    <main>
      <h1 className="visually-hidden">Find a pet sitter</h1>
      {/* The page reads its search from the URL (useSearchParams), which needs
          a Suspense boundary so the rest can be prerendered. */}
      <Suspense fallback={<PlaygroundSkeleton />}>
        <SearchPage />
      </Suspense>
    </main>
  );
}
