"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const DATA_BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const DATA_URL = `${DATA_BASE}/data/alphagenome_coverage.json`;

const NATURE_PAPER_URL =
  "https://www.nature.com/articles/s41586-025-10014-0";

const MODALITY_ORDER = [
  "rna_seq",
  "cage",
  "procap",
  "dnase",
  "atac",
  "chip_histone",
  "chip_tf",
  "splice_sites",
  "splice_junctions",
  "splice_site_usage",
  "contact_maps",
] as const;

const humanTags = [
  "Liver",
  "Brain",
  "Heart",
  "Lung",
  "Kidney",
  "Breast cancer",
  "T cell",
  "Stem cell",
  "Muscle",
  "Pancreas",
  "Blood",
  "Skin",
  "Colon",
  "Artery",
  "Prostate",
  "Neuron",
] as const;

const mouseTags = [
  "Brain",
  "Liver",
  "Heart",
  "Lung",
  "Kidney",
  "Embryo",
  "Stem cell",
  "Muscle",
  "Intestine",
  "Blood",
  "Skin",
  "Spleen",
  "Thymus",
  "Bone marrow",
  "Cerebellum",
  "Cortex",
] as const;

type ModalitySummaryEntry = {
  label: string;
  description: string;
  resolution_bp: number;
  total_tracks: number;
  unique_biosamples: number;
  name_column: string | null;
};

type TissueModalityEntry = {
  tracks: number;
  label: string;
};

type TissueData = {
  name: string;
  ontology_term: string | null;
  biosample_type?: string | null;
  tissue_categories?: string[];
  total_tracks: number;
  modalities_covered: number;
  modalities: Record<string, TissueModalityEntry>;
};

type SpeciesData = {
  total_tracks: number;
  unique_biosamples: number;
  modality_summary: Record<string, ModalitySummaryEntry>;
  tissues: Record<string, TissueData>;
};

type CoverageJson = {
  generated_utc: string;
  human: SpeciesData;
  mouse: SpeciesData;
};

function topTissuesByTracks(
  tissues: Record<string, TissueData> | undefined,
  n: number
): TissueData[] {
  if (!tissues) return [];
  return Object.values(tissues)
    .sort((a, b) => b.total_tracks - a.total_tracks)
    .slice(0, n);
}

export default function CoverageExplorer() {
  const [data, setData] = useState<CoverageJson | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    "loading"
  );
  const [species, setSpecies] = useState<"human" | "mouse">("human");
  const [tab, setTab] = useState<"tissue" | "overview">("tissue");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<CoverageJson>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoadState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setLoadState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setQuery("");
    setExpandedKey(null);
  }, [species]);

  const modalityCount = MODALITY_ORDER.length;

  const selected = species === "human" ? data?.human : data?.mouse;
  const tissueData = selected?.tissues;
  const modalitySummary = selected?.modality_summary;

  const topFive = useMemo(
    () => topTissuesByTracks(tissueData, 5),
    [tissueData]
  );

  const filteredTissues = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q || !tissueData) return [];
    return Object.values(tissueData)
      .filter((tissue) => {
        return (
          tissue.name.toLowerCase().includes(q) ||
          (tissue.ontology_term?.toLowerCase() ?? "").includes(q) ||
          (tissue.tissue_categories ?? []).some((c) =>
            c.toLowerCase().includes(q)
          )
        );
      })
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || b.total_tracks - a.total_tracks;
      });
  }, [tissueData, debouncedQuery]);

  const hasSearch = debouncedQuery.trim().length > 0;
  const noMatches = hasSearch && filteredTissues.length === 0;

  const modalityRows = useMemo(() => {
    const summary = modalitySummary ?? {};
    return MODALITY_ORDER.map((key) => {
      const m = summary[key];
      return {
        key,
        label: m?.label ?? key,
        description: m?.description ?? "",
        resolution_bp: m?.resolution_bp ?? 0,
        total_tracks: m?.total_tracks ?? 0,
        unique_biosamples: m?.unique_biosamples ?? 0,
        name_column: m?.name_column ?? null,
      };
    });
  }, [modalitySummary]);

  const maxModalityTracks = useMemo(() => {
    if (!modalityRows.length) return 1;
    return Math.max(...modalityRows.map((m) => m.total_tracks), 1);
  }, [modalityRows]);

  const toggleExpand = useCallback((name: string) => {
    setExpandedKey((prev) => (prev === name ? null : name));
  }, []);

  const applyChip = useCallback((tag: string) => {
    setQuery(tag);
  }, []);

  const hasTissueData = Boolean(
    tissueData && Object.keys(tissueData).length > 0
  );

  return (
    <section className="bg-gray-50 px-6 pt-6 pb-20">
      <div className="mx-auto max-w-5xl">
        {loadState === "loading" ? (
          <p className="text-center text-gray-500">Loading coverage…</p>
        ) : null}

        {loadState === "error" ||
        (loadState === "idle" && data && !hasTissueData) ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">
              Could not load coverage data. Generate{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
                data/alphagenome_coverage.json
              </code>{" "}
              with{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
                scripts/fetch_metadata.py
              </code>
              , then run{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
                npm run dev
              </code>{" "}
              so it is copied to{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
                public/data/
              </code>
              .
            </p>
          </div>
        ) : null}

        {loadState === "idle" && hasTissueData && data ? (
          <>
            <div
              className="mt-6 mb-10 inline-flex rounded-full bg-gray-100/80 p-1"
              role="tablist"
              aria-label="Coverage views"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "tissue"}
                onClick={() => setTab("tissue")}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  tab === "tissue"
                    ? "bg-black text-white"
                    : "bg-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Find my tissue
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "overview"}
                onClick={() => setTab("overview")}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  tab === "overview"
                    ? "bg-black text-white"
                    : "bg-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Model overview
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Coverage data as of{" "}
              {new Date(data.generated_utc).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>

            {tab === "tissue" ? (
              <div className="space-y-8">
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setSpecies("human")}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors border ${
                      species === "human"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    Human
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecies("mouse")}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors border ${
                      species === "mouse"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    Mouse
                  </button>
                </div>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search biosample or ontology…"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:border-gray-300"
                />

                <div className="flex flex-wrap gap-2">
                  {(species === "human" ? humanTags : mouseTags).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => applyChip(tag)}
                      className="cursor-pointer rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 transition-colors hover:border-gray-400"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {!hasSearch ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Search or tap a tag to filter. Below are the five most
                      covered biosamples.
                    </p>
                    <ul className="space-y-4">
                      {topFive.map((t) => (
                        <TissueCard
                          key={t.name}
                          tissue={t}
                          data={data}
                          expanded={expandedKey === t.name}
                          onToggle={() => toggleExpand(t.name)}
                        />
                      ))}
                    </ul>
                  </div>
                ) : noMatches ? (
                  <div className="space-y-6">
                    <p className="text-gray-500">
                      No tissues match &ldquo;{debouncedQuery.trim()}
                      &rdquo;. Try another term or browse these highly covered
                      examples:
                    </p>
                    <ul className="space-y-4">
                      {topFive.map((t) => (
                        <TissueCard
                          key={t.name}
                          tissue={t}
                          data={data}
                          expanded={expandedKey === t.name}
                          onToggle={() => toggleExpand(t.name)}
                        />
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {filteredTissues.map((t) => (
                      <TissueCard
                        key={t.name}
                        tissue={t}
                        data={data}
                        expanded={expandedKey === t.name}
                        onToggle={() => toggleExpand(t.name)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <MetricCard
                    label={species === "human" ? "Human tracks" : "Mouse tracks"}
                    value={(selected?.total_tracks ?? 0).toLocaleString()}
                  />
                  <MetricCard
                    label={species === "human" ? "Cell types" : "Cell types"}
                    value={String(Object.keys(tissueData ?? {}).length)}
                  />
                  <MetricCard
                    label="Modalities"
                    value={String(modalityCount)}
                  />
                  <MetricCard
                    label={species === "human" ? "Human (reference)" : "Mouse (reference)"}
                    value={
                      species === "human"
                        ? "5,563 tracks · 714 cell types"
                        : `${(data.mouse.total_tracks ?? 0).toLocaleString()} tracks · ${Object.keys(data.mouse.tissues ?? {}).length} cell types`
                    }
                  />
                </div>

                <div>
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Modalities
                  </h3>
                  <div className="overflow-x-auto rounded-2xl bg-white">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500">
                          <th className="pb-3 pr-4 font-medium">Modality</th>
                          <th className="pb-3 pr-4 font-medium text-right">
                            Tracks
                          </th>
                          <th className="pb-3 pr-4 font-medium text-right">
                            Biosamples
                          </th>
                          <th className="pb-3 font-medium text-right">
                            Resolution (bp)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalityRows.map((row) => (
                          <tr
                            key={row.key}
                            className="border-b border-gray-100 text-gray-800 last:border-0"
                          >
                            <td className="py-3 pr-4 font-medium text-gray-900">
                              {row.label}
                            </td>
                            <td className="py-3 pr-4 text-right tabular-nums">
                              {row.total_tracks.toLocaleString()}
                            </td>
                            <td className="py-3 pr-4 text-right tabular-nums">
                              {row.unique_biosamples.toLocaleString()}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {row.resolution_bp.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Tracks per modality
                  </h3>
                  <div className="space-y-4 rounded-2xl bg-white p-6">
                    {modalityRows.map((row) => {
                      const pct =
                        (row.total_tracks / maxModalityTracks) * 100;
                      return (
                        <div key={row.key} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-900">
                              {row.label}
                            </span>
                            <span className="tabular-nums text-gray-500">
                              {row.total_tracks.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-brand-gradient transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}

        <footer className="mt-12 pt-6 border-t border-gray-100 text-xs text-gray-400 text-center space-y-1">
          <p>
            Track counts derived from the AlphaGenome API{" "}
            <code className="font-mono">output_metadata()</code>. See
            Supplementary Table 2 of{" "}
            <a
              href="https://www.nature.com/articles/s41586-025-10014-0"
              className="underline hover:text-gray-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Avsec et al., Nature 2026
            </a>
            .
          </p>
          <p>
            AlphaGenome is developed by Google DeepMind. This tool uses the
            AlphaGenome public API for non-commercial research purposes only.
          </p>
          <p>
            © 2026{" "}
            <a
              href="https://parulkudtarkar.com"
              className="underline hover:text-gray-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Parul Kudtarkar
            </a>
            . Tool design and implementation.
          </p>
        </footer>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
        {value}
      </p>
    </div>
  );
}

type TissueCardProps = {
  tissue: TissueData;
  data: CoverageJson;
  expanded: boolean;
  onToggle: () => void;
};

function TissueCard({
  tissue,
  data,
  expanded,
  onToggle,
}: TissueCardProps) {
  const summary =
    (data as unknown as { human: SpeciesData; mouse: SpeciesData }).human
      ?.modality_summary ?? {};

  return (
    <li className="overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:border-gray-300">
      <button
        type="button"
        onClick={onToggle}
        className="w-full cursor-pointer p-5 text-left"
        aria-expanded={expanded}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-medium text-gray-900">{tissue.name}</p>
            {tissue.ontology_term ? (
              <p className="mt-1 text-sm text-gray-500">
                {tissue.ontology_term}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-gray-600">
              {tissue.total_tracks.toLocaleString()}{" "}
              {tissue.total_tracks === 1 ? "track" : "tracks"} ·{" "}
              {tissue.modalities_covered}/11 modalities
            </p>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-gray-100 px-5 pb-5 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {MODALITY_ORDER.map((key) => {
              const meta = summary[key];
              const tracks = tissue.modalities[key]?.tracks ?? 0;
              const label =
                meta?.label ?? tissue.modalities[key]?.label ?? key;
              const res = meta?.resolution_bp ?? 0;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{label}</p>
                    <span className="text-sm tabular-nums">
                      {tracks > 0 ? (
                        <span className="font-medium text-green-700">
                          {tracks.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="tabular-nums font-medium text-gray-800">
                      {tracks.toLocaleString()}
                    </span>{" "}
                    {tracks === 1 ? "track" : "tracks"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Resolution: {res.toLocaleString()} bp
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </li>
  );
}
