import BulletinBoard from "@/components/Notes/BulletinBoard";

export default function NotesPage() {
  return (
    // Capped to exactly one viewport below the sticky header (same
    // --taskbar-height var the /etc detail pages use), laid out as a
    // column so the board below can claim "whatever's left after the
    // heading" via flex-1/min-h-0 instead of an arbitrary vh guess — the
    // whole page (heading + board) fits on load with no scrolling needed.
    <section
      className="mx-auto flex w-full flex-col px-4 pt-6 text-center"
      style={{ height: "calc(100dvh - var(--taskbar-height, 4.375rem))" }}
    >
      <h1 className="font-singsong text-[clamp(2rem,6vw,3.5rem)] leading-none text-[#2460A4]">Bulletin Board</h1>

      <div className="mt-8 min-h-0 flex-1 pb-8">
        <BulletinBoard />
      </div>
    </section>
  );
}
