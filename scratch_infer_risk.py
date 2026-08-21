import csv
from collections import defaultdict
import statistics

merged_csv_path = r"d:\TEFAS\data\merged_katilim.csv"
merged_js_path = r"d:\TEFAS\data\merged_katilim.js"

rows = []
header = []
with open(merged_csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        rows.append(row)

# Group risk values by Şemsiye Fon Türü and keywords in Fon Adı to find averages/modes
semsiye_risks = defaultdict(list)
keyword_risks = defaultdict(list)

for row in rows:
    risk_str = row[3].replace(',', '.')
    if risk_str and risk_str.strip() != "":
        try:
            risk = float(risk_str)
            semsiye_risks[row[2]].append(risk)
            
            # Simple keyword extraction
            name = row[1].upper()
            if "ALTIN" in name: keyword_risks["ALTIN"].append(risk)
            elif "HİSSE" in name: keyword_risks["HİSSE"].append(risk)
            elif "PARA PİYASASI" in name: keyword_risks["PARA PİYASASI"].append(risk)
            elif "KISA VADELİ" in name: keyword_risks["KISA VADELİ"].append(risk)
            elif "KİRA SERTİFİKASI" in name: keyword_risks["KİRA SERTİFİKASI"].append(risk)
        except ValueError:
            pass

# Function to guess risk
def guess_risk(row):
    # Hardcoded rules requested by user or obvious ones
    code = row[0].upper()
    name = row[1].upper()
    semsiye = row[2]
    
    if code == "KZL":
        return "6"
    
    # Try keywords first
    if "ALTIN" in name or "KIYMETLİ MADEN" in name:
        return "6"
    if "HİSSE" in name:
        return "6" # Most equity funds are 6 or 7
    if "PARA PİYASASI" in name:
        return "1"
    if "KISA VADELİ" in name:
        return "2"
        
    # Fallback to semsiye mode/median
    risks = semsiye_risks.get(semsiye, [])
    if risks:
        return str(int(round(statistics.median(risks))))
    
    # Ultimate fallback
    return "5"

updates_made = []
for row in rows:
    risk_str = row[3]
    if not risk_str or risk_str.strip() == "" or risk_str.strip() == '""':
        new_risk = guess_risk(row)
        updates_made.append(f"{row[0]} ({row[1]}): {new_risk}")
        row[3] = new_risk
        
# Write back to CSV
with open(merged_csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(header)
    for row in rows:
        writer.writerow(row)

# Write to JS
with open(merged_csv_path, 'r', encoding='utf-8-sig') as f:
    csv_content = f.read()

js_content = f"const csvRawData = `\\n\ufeff{csv_content}`;"
with open(merged_js_path, 'w', encoding='utf-8-sig') as f:
    f.write(js_content)

print("Updates made:")
for u in updates_made:
    print(u)
