import { TranslatorShell } from "../components/translator/TranslatorShell";

export default function Home(): JSX.Element {
  return (
    <main className="min-h-screen bg-[#090909] text-[#f5f5f5]">
      <TranslatorShell />
    </main>
  );
}
