import BulletinBoard from "@/components/Notes/BulletinBoard";

export default function NotesPage() {
  return (
    <section className="w-full px-4 pb-36 pt-20 text-center">
      <h1 className="font-singsong text-[clamp(2rem,6vw,3.5rem)] leading-none text-[#2460A4]">Bulletin Board</h1>

      <div className="mt-20">
        <BulletinBoard />
      </div>
    </section>
  );
}
