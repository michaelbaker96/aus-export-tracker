/**
 * Arr! Welcome to the Captain's deck!
 * This be the main viewport where we track the bounty flowin' out of Australia.
 * We've framed the map in a sturdy slate hull to keep our bearings straight.
 */
import MapClientWrapper from "@/components/MapClientWrapper";

export default function Home() {
  return (
    <main className="h-screen w-screen flex flex-col bg-surface overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-outline/20 flex items-center px-6 shrink-0">
        <h1 className="font-headline font-bold text-lg tracking-tight text-on-surface">
          Aus Export Tracker
        </h1>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        <MapClientWrapper />
      </div>
    </main>
  );
}
