from alphagenome.models import dna_client

API_KEY = "YOUR_API_KEY_HERE"

model = dna_client.create(API_KEY)
meta = model.output_metadata(organism=dna_client.Organism.HOMO_SAPIENS)

print("=== All attributes on meta ===")
for attr in dir(meta):
    if not attr.startswith("_"):
        try:
            val = getattr(meta, attr)
            if hasattr(val, 'columns'):
                print(f"  meta.{attr} → columns: {list(val.columns)}")
            else:
                print(f"  meta.{attr} → {type(val).__name__}")
        except Exception as e:
            print(f"  meta.{attr} → ERROR: {e}")
