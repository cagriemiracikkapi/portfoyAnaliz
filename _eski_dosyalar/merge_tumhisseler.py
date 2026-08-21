import pandas as pd
import os

files = [
    'tumhisseler/Menkul_Kiymet_Yatirim_Fonlari_CSV_Tum_Veri_2026-08-21 (3).csv',
    'tumhisseler/Menkul_Kiymet_Yatirim_Fonlari_CSV_Tum_Veri_2026-08-21 (4).csv',
    'tumhisseler/Menkul_Kiymet_Yatirim_Fonlari_CSV_Tum_Veri_2026-08-21 (5).csv'
]

try:
    df1 = pd.read_csv(files[0], skiprows=3, encoding='utf-8-sig')
    df2 = pd.read_csv(files[1], skiprows=3, encoding='utf-8-sig')
    df3 = pd.read_csv(files[2], skiprows=3, encoding='utf-8-sig')
    
    # Identify Katılım funds
    def is_katilim(row):
        fon_adi = str(row.get('Fon Adı', ''))
        semsiye = str(row.get('Şemsiye Fon Türü', ''))
        text = fon_adi + " " + semsiye
        text_norm = text.replace('I', 'i').replace('İ', 'i').replace('ı', 'i').lower()
        return 'katilim' in text_norm

    mask1 = df1.apply(is_katilim, axis=1)
    mask2 = df2.apply(is_katilim, axis=1)
    mask3 = df3.apply(is_katilim, axis=1)
    
    # Collect all unique Katilim Fon Kodus across any of the files just in case
    katilim_codes = set(df1[mask1]['Fon Kodu']).union(set(df2[mask2]['Fon Kodu'])).union(set(df3[mask3]['Fon Kodu']))
    katilim_codes = list(katilim_codes)
    
    # Filter all dataframes
    df1_f = df1[df1['Fon Kodu'].isin(katilim_codes)].copy()
    df2_f = df2[df2['Fon Kodu'].isin(katilim_codes)].copy()
    df3_f = df3[df3['Fon Kodu'].isin(katilim_codes)].copy()
    
    # Drop duplicated columns
    df2_f = df2_f.drop(columns=['Fon Adı', 'Şemsiye Fon Türü'], errors='ignore')
    df3_f = df3_f.drop(columns=['Fon Adı', 'Şemsiye Fon Türü'], errors='ignore')
    
    # Merge
    merged = pd.merge(df1_f, df2_f, on='Fon Kodu', how='outer')
    merged = pd.merge(merged, df3_f, on='Fon Kodu', how='outer')
    
    out_path = 'tumhisseler/merged_katilim.csv'
    merged.to_csv(out_path, index=False, encoding='utf-8-sig')
    print(f"Success! Created {out_path} with {len(merged)} katılım funds.")
    print(f"Columns: {len(merged.columns)}")
    
except Exception as e:
    print(f"Error: {e}")
