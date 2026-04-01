"""
AlphaGenome Coverage Metadata Fetcher
======================================
Pulls real metadata from the AlphaGenome API for both human
and mouse, and saves a single JSON file for the coverage
explorer web app.

Requirements:
    pip install alphagenome pandas

API key:
    https://deepmind.google.com/science/alphagenome

Usage:
    python scripts/fetch_metadata.py

Output:
    data/alphagenome_coverage.json
    (copy to public/ before running the Next.js app:
     cp data/alphagenome_coverage.json public/)
"""

import json
import os
import sys
import datetime

try:
    import pandas as pd
    from alphagenome.models import dna_client
except ImportError:
    print("Missing dependencies. Run: pip install alphagenome pandas")
    sys.exit(1)

API_KEY = "YOUR_API_KEY_HERE"

if API_KEY == "YOUR_API_KEY_HERE":
    print("ERROR: Set your API key before running.")
    print("Get one at: https://deepmind.google.com/science/alphagenome")
    sys.exit(1)


# ── Modality config ───────────────────────────────────────────────────────────
# Verified against SDK output from verify.py
# splice_sites only has ['name', 'strand'] — no biosample_name column
# All other modalities confirmed to have biosample_name

MODALITIES = {
    "rna_seq":           ("RNA-seq",           "Gene expression",                    1),
    "cage":              ("CAGE",               "Transcription start sites",          1),
    "procap":            ("PRO-cap",            "Nascent transcription",              1),
    "dnase":             ("DNase-seq",          "Chromatin accessibility",            1),
    "atac":              ("ATAC-seq",           "Chromatin accessibility",            1),
    "chip_histone":      ("Histone ChIP-seq",   "Histone modifications",            128),
    "chip_tf":           ("TF ChIP-seq",        "TF binding",                       128),
    "splice_sites":      ("Splice sites",       "Splice site probabilities",          1),
    "splice_junctions":  ("Splice junctions",   "Splice junction read counts",        1),
    "splice_site_usage": ("Splice site usage",  "Fraction of transcripts per site",   1),
    "contact_maps":      ("Contact maps",       "3D chromatin contacts",           2048),
}

NO_BIOSAMPLE_COLUMN = {"splice_sites"}

TISSUE_KEYWORDS = {
    "liver": ["hepg2", "hep g2", "liver", "hepat"],
    "brain": ["brain", "neuro", "cortex", "cerebel", "hippoc", "gliob", "astro"],
    "blood": ["k562", "gm12878", "blood", "leukemia", "lymph", "cd4", "cd8", "monocyte", "erythro", "hematopoiet"],
    "breast": ["mcf", "breast", "mammary"],
    "lung":   ["lung", "a549", "bronch"],
    "kidney": ["kidney", "renal", "hek293"],
    "heart":  ["heart", "cardiac", "ventric"],
    "muscle": ["muscle", "myoblast", "myotube"],
    "skin":   ["skin", "keratin", "melanoc", "fibrob"],
    "colon":  ["colon", "colo", "colorect", "intestin"],
    "pancreas": ["pancreas", "beta cell", "islet"],
    "prostate": ["prostate", "lncap", "pc-3"],
    "stem":   ["stem", "esc", "ipsc", "embryo", "pluripot"],
    "t_cell": ["t cell", "t-cell", "jurkat", "thymus"],
}


# ── Helper: build per-tissue breakdown from a metadata object ─────────────────

def build_species_data(meta, organism_label):
    """
    Given a metadata object returned by output_metadata(),
    returns a dict with modality_summary, tissues, and total_tracks.
    Uses the same logic for both human and mouse.
    """
    print(f"\n  Modality summary ({organism_label}):")

    all_dfs = {}
    modality_summary = {}
    total_tracks = 0

    for attr, (label, description, resolution) in MODALITIES.items():
        try:
            df = getattr(meta, attr)
        except AttributeError:
            print(f"    WARNING: meta.{attr} not found — skipping")
            continue

        if not isinstance(df, pd.DataFrame):
            print(f"    WARNING: meta.{attr} is not a DataFrame — skipping")
            continue

        all_dfs[attr] = df
        track_count = len(df)
        total_tracks += track_count

        if attr in NO_BIOSAMPLE_COLUMN:
            unique_biosamples = 0
            note = "Per-tissue breakdown unavailable — no biosample column in metadata"
        else:
            unique_biosamples = (
                df["biosample_name"].nunique()
                if "biosample_name" in df.columns else 0
            )
            note = None

        entry = {
            "label":             label,
            "description":       description,
            "resolution_bp":     resolution,
            "total_tracks":      track_count,
            "unique_biosamples": unique_biosamples,
        }
        if note:
            entry["note"] = note

        modality_summary[attr] = entry
        print(f"    {label:<22} {track_count:>5} tracks   {unique_biosamples:>4} biosamples")

    # Collect all unique biosample names across modalities that have the column
    all_biosamples = set()
    for attr, df in all_dfs.items():
        if attr not in NO_BIOSAMPLE_COLUMN and "biosample_name" in df.columns:
            all_biosamples.update(df["biosample_name"].dropna().unique())

    print(f"\n  Building per-tissue breakdown for {len(all_biosamples)} biosamples...")

    tissues = {}

    for biosample in sorted(all_biosamples):
        tissue_data = {
            "name":               biosample,
            "ontology_term":      None,
            "biosample_type":     None,
            "life_stage":         None,
            "total_tracks":       0,
            "modalities_covered": 0,
            "modalities":         {},
        }

        for attr, df in all_dfs.items():
            if attr in NO_BIOSAMPLE_COLUMN:
                continue
            if "biosample_name" not in df.columns:
                continue

            subset = df[df["biosample_name"] == biosample]
            count = len(subset)

            if count == 0:
                continue

            label = modality_summary[attr]["label"]
            modality_entry = {
                "tracks": count,
                "label":  label,
            }

            # Ontology term — first non-null value seen
            if tissue_data["ontology_term"] is None and "ontology_curie" in subset.columns:
                vals = subset["ontology_curie"].dropna().unique()
                if len(vals) > 0:
                    tissue_data["ontology_term"] = str(vals[0])

            # Biosample type (cell line, tissue, primary cell, etc.)
            if tissue_data["biosample_type"] is None and "biosample_type" in subset.columns:
                vals = subset["biosample_type"].dropna().unique()
                if len(vals) > 0:
                    tissue_data["biosample_type"] = str(vals[0])

            # Life stage (adult, embryonic, etc.)
            if tissue_data["life_stage"] is None and "biosample_life_stage" in subset.columns:
                vals = subset["biosample_life_stage"].dropna().unique()
                if len(vals) > 0:
                    tissue_data["life_stage"] = str(vals[0])

            # Histone marks available for this tissue
            if attr == "chip_histone" and "histone_mark" in subset.columns:
                marks = sorted(subset["histone_mark"].dropna().unique().tolist())
                if marks:
                    modality_entry["histone_marks"] = marks

            # TFs available for this tissue
            if attr == "chip_tf" and "transcription_factor" in subset.columns:
                tfs = sorted(subset["transcription_factor"].dropna().unique().tolist())
                if tfs:
                    modality_entry["transcription_factors"] = tfs

            tissue_data["modalities"][attr] = modality_entry
            tissue_data["total_tracks"] += count

        tissue_data["modalities_covered"] = len(tissue_data["modalities"])
        tissues[biosample] = tissue_data

    return {
        "modality_summary": modality_summary,
        "tissues":          tissues,
        "total_tracks":     total_tracks,
    }


# ── Connect ───────────────────────────────────────────────────────────────────

print("Connecting to AlphaGenome API...")
model = dna_client.create(API_KEY)


# ── Human ─────────────────────────────────────────────────────────────────────

print("\nFetching human metadata...")
meta_human = model.output_metadata(organism=dna_client.Organism.HOMO_SAPIENS)
human_data = build_species_data(meta_human, "human")


# ── Mouse ─────────────────────────────────────────────────────────────────────

print("\nFetching mouse metadata...")
meta_mouse = model.output_metadata(organism=dna_client.Organism.MUS_MUSCULUS)
mouse_data = build_species_data(meta_mouse, "mouse")


# ── Assemble output ───────────────────────────────────────────────────────────
# JSON structure separates human and mouse cleanly at the top level.
# The UI reads data.human.tissues or data.mouse.tissues depending
# on which species toggle is active.

output = {
    "generated_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),

    "human": {
        "total_tracks":      human_data["total_tracks"],
        "unique_biosamples": len(human_data["tissues"]),
        "modality_summary":  human_data["modality_summary"],
        "tissues":           human_data["tissues"],
    },

    "mouse": {
        "total_tracks":      mouse_data["total_tracks"],
        "unique_biosamples": len(mouse_data["tissues"]),
        "modality_summary":  mouse_data["modality_summary"],
        "tissues":           mouse_data["tissues"],
    },
}

# ── Add tissue categories ─────────────────────────────────────────────────────

for species_key in ("human", "mouse"):
    for tissue in output[species_key]["tissues"].values():
        name_lower = tissue["name"].lower()
        categories = []
        for category, keywords in TISSUE_KEYWORDS.items():
            if any(kw in name_lower for kw in keywords):
                categories.append(category)
        tissue["tissue_categories"] = categories


# ── Save ──────────────────────────────────────────────────────────────────────

os.makedirs("data", exist_ok=True)
output_path = "data/alphagenome_coverage.json"

with open(output_path, "w") as f:
    json.dump(output, f, indent=2)


# ── Summary ───────────────────────────────────────────────────────────────────

print(f"""
Done.
  Human:  {human_data["total_tracks"]:>5} tracks   {len(human_data["tissues"]):>4} biosamples
  Mouse:  {mouse_data["total_tracks"]:>5} tracks   {len(mouse_data["tissues"]):>4} biosamples
  Saved to {output_path}

Next step:
  cp data/alphagenome_coverage.json public/
  npm run dev
""")


# ── Spot-check ────────────────────────────────────────────────────────────────

print("Spot-check — first 3 human biosamples:")
for name in list(human_data["tissues"].keys())[:3]:
    t = human_data["tissues"][name]
    mods = ", ".join(t["modalities"].keys())
    print(f"  {name}")
    print(f"    tracks: {t['total_tracks']}  modalities: {t['modalities_covered']}/11")
    print(f"    ontology: {t['ontology_term']}  type: {t['biosample_type']}")
    print(f"    modalities: {mods}")

print("\nSpot-check — first 3 mouse biosamples:")
for name in list(mouse_data["tissues"].keys())[:3]:
    t = mouse_data["tissues"][name]
    mods = ", ".join(t["modalities"].keys())
    print(f"  {name}")
    print(f"    tracks: {t['total_tracks']}  modalities: {t['modalities_covered']}/11")
    print(f"    ontology: {t['ontology_term']}  type: {t['biosample_type']}")
    print(f"    modalities: {mods}")
