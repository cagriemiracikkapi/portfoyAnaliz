import pandas as pd

try:
    df1 = pd.read_csv('csv1.csv', skiprows=3)
    df2 = pd.read_csv('csv2.csv', skiprows=3)
    df3 = pd.read_csv('csv3.csv', skiprows=3)

    # We will merge ONLY on 'Fon Kodu' as it's the unique identifier
    # First, let's drop 'Fon Adı' and 'Şemsiye Fon Türü' from df2 and df3 to avoid duplicated columns.
    df2 = df2.drop(columns=['Fon Adı', 'Şemsiye Fon Türü'])
    df3 = df3.drop(columns=['Fon Adı', 'Şemsiye Fon Türü'])
    
    # Merge the dataframes on 'Fon Kodu'
    merged = pd.merge(df1, df2, on='Fon Kodu', how='outer')
    merged = pd.merge(merged, df3, on='Fon Kodu', how='outer')
    
    # Save the output
    merged.to_csv('merged.csv', index=False, encoding='utf-8-sig')
    print("Successfully merged into merged.csv")

    # Display some stats
    print(f"Total rows in merged.csv: {len(merged)}")
    print(f"Total columns in merged.csv: {len(merged.columns)}")

except Exception as e:
    print(f"Error occurred: {e}")
