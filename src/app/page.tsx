import { ArrowLeftRight, Clock, Mic } from "lucide-react";

export default function Home(): JSX.Element {
  return (
    <main className="min-h-screen bg-[#090909] text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex flex-col gap-3 border-b border-[#2a2a2a] pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#f5f5f5]">
              Live Voice Translator
            </h1>
            <p className="text-xs text-[#a3a3a3]" aria-live="polite">
              Idle. Choose languages, then start the microphone.
            </p>
          </div>

          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#f5f5f5] px-4 py-2 text-sm font-medium text-[#090909] hover:bg-[#d4d4d4]"
            type="button"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            Start
          </button>
        </header>

        <section
          className="grid gap-3 rounded-lg border border-[#2a2a2a] bg-[#121212] p-4 md:grid-cols-[1fr_auto_1fr] md:items-end"
          aria-label="Language selection"
        >
          <label className="grid gap-2 text-xs font-medium uppercase text-[#a3a3a3]">
            From
            <select className="rounded-md border border-[#2a2a2a] bg-[#181818] px-3 py-2 text-sm normal-case text-[#f5f5f5]">
              <option>Korean</option>
              <option>English</option>
              <option>Japanese</option>
              <option>Chinese</option>
              <option>Spanish</option>
            </select>
          </label>

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#2a2a2a] text-[#f5f5f5] hover:bg-[#181818]"
            type="button"
            aria-label="Swap languages"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <label className="grid gap-2 text-xs font-medium uppercase text-[#a3a3a3]">
            To
            <select className="rounded-md border border-[#2a2a2a] bg-[#181818] px-3 py-2 text-sm normal-case text-[#f5f5f5]">
              <option>English</option>
              <option>Korean</option>
              <option>Japanese</option>
              <option>Chinese</option>
              <option>Spanish</option>
            </select>
          </label>
        </section>

        <section className="grid flex-1 gap-4 md:grid-cols-2">
          <article className="min-h-52 rounded-lg border border-[#2a2a2a] bg-[#121212] p-4">
            <h2 className="text-xs font-medium uppercase text-[#a3a3a3]">
              Original transcript
            </h2>
            <p className="mt-6 text-2xl font-medium leading-snug text-[#737373] md:text-3xl">
              Waiting for speech...
            </p>
          </article>

          <article className="min-h-52 rounded-lg border border-[#2a2a2a] bg-[#121212] p-4">
            <h2 className="text-xs font-medium uppercase text-[#a3a3a3]">
              Translation
            </h2>
            <p className="mt-6 text-3xl font-semibold leading-tight text-[#737373] md:text-4xl">
              Translation will appear here.
            </p>
          </article>
        </section>

        <section className="rounded-lg border border-[#2a2a2a] bg-[#121212] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-[#a3a3a3]">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Recent translations
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#737373]">
            No confirmed translations in this session.
          </p>
        </section>
      </div>
    </main>
  );
}
