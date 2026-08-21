import csv
import json
import os

new_data_path = r"d:\TEFAS\_eski_dosyalar\tumhisseler\Menkul_Kiymet_Yatirim_Fonlari_CSV_Tum_Veri_2026-08-21 (7).csv"
merged_csv_path = r"d:\TEFAS\data\merged_katilim.csv"
merged_js_path = r"d:\TEFAS\data\merged_katilim.js"

# Read the new data and map by Fon Kodu
new_data = {}
with open(new_data_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    for i in range(4): # skip headers and empty lines at the beginning
        next(reader, None)
    
    # Actually, let's just search for the header row
    f.seek(0)
    lines = f.readlines()
    start_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("Fon Kodu"):
            start_idx = i
            break
            
    f.seek(0)
    reader = csv.reader(f)
    for _ in range(start_idx + 1):
        next(reader, None)
        
    for row in reader:
        if len(row) > 10:
            new_data[row[0]] = row

# Read the old merged_katilim.csv
old_rows = []
header = []
with open(merged_csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        old_rows.append(row)

# Update the old data
for row in old_rows:
    fon_kodu = row[0]
    if fon_kodu in new_data:
        new_row = new_data[fon_kodu]
        # Update Risk and returns (Indices 3 to 10)
        # Note: If new data has empty string, we might keep old if old is better, but usually new is better.
        for i in range(3, 11):
            val = new_row[i]
            # Replace empty or "0,00" with actual data if available
            if val and val != "0,00":
                row[i] = val
            elif not row[i] or row[i] == "0,00":
                row[i] = val # keep new value even if empty

# Write back to merged_katilim.csv
with open(merged_csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(header)
    for row in old_rows:
        writer.writerow(row)

# Write to merged_katilim.js
with open(merged_csv_path, 'r', encoding='utf-8-sig') as f:
    csv_content = f.read()

js_content = f"const csvRawData = `\\n\ufeff{csv_content}`;"

with open(merged_js_path, 'w', encoding='utf-8-sig') as f:
    f.write(js_content)

print("Merge completed successfully.")
