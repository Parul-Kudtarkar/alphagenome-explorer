export function Hero() {
  return (
    <section className="pt-24 md:pt-32 flex flex-col items-center justify-center text-center px-6 bg-white">
      <h1
        className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl"
        style={{
          background:
            "linear-gradient(90deg, #FF2D78, #9B6DFF, #4A90D9, #5AC8C8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        AlphaGenome Coverage Explorer
      </h1>
      <p className="mt-6 max-w-2xl text-xl text-gray-500">
        Check whether your tissue or cell type is covered in AlphaGenome&apos;s
        5,563 training tracks before you run the model.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <span className="rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-600">
          5,563 human tracks
        </span>
        <span className="text-gray-300">·</span>
        <span className="rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-600">
          1,038 mouse tracks
        </span>
        <span className="text-gray-300">·</span>
        <span className="rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-600">
          11 modalities
        </span>
        <span className="text-gray-300">·</span>
        <span className="rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-600">
          714 human · 179 mouse cell types
        </span>
      </div>
      <div
        className="h-px w-full shrink-0 bg-brand-gradient"
        aria-hidden
      />
    </section>
  );
}
