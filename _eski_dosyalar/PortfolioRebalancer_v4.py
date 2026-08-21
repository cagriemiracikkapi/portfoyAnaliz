# PortfolioRebalancer_v4.py
# Güncel Ekran Görüntüsü ve Yeni BTK Satış Tutarına Göre Revize (21 Ağustos)
# Teknoloji %15, Altın %15, Para Piyasası %45

portfolio_total = 636656.65 # Toplam yeni değer (nakit + kalanlar)

# Yeni BTK satış rakamı (35,374.05 TL eklendi)
cash_pool = 97101.78 + 60185.62 + 35108.71 + 35116.44 + 51074.97 + 50717.89 + 35374.05

# --- Hedef Dağılım Oranları (%) ---
target_ratios = {
    'Para_Piyasasi': 0.45,    # AIS & GPN
    'Teknoloji': 0.15,        # CPU & BTK
    'Kira_Sertifikasi': 0.15, # RBT
    'Altin': 0.15,            # KZL
    'Hisse_Senedi': 0.10      # RBH
}

# --- Mevcut Varlıklar (Satılmayanlar) ---
# BTK için 66130.96 - 35374.05 = 30756.91 kalan hesaplanmıştır.
current_balances = {
    'AIS': 129463.20,
    'GPN': 0,
    'CPU': 65483.80,
    'BTK': 30756.91, 
    'KZL': 46273.28,
    'RBT': 0,
    'RBH': 0
}

# --- TL Cinsinden Yeni Hedefler ---
targets_tl = {
    'Para_Piyasasi': portfolio_total * target_ratios['Para_Piyasasi'],
    'Teknoloji': portfolio_total * target_ratios['Teknoloji'],
    'Altin': portfolio_total * target_ratios['Altin'],
    'Kira_Sertifikasi': portfolio_total * target_ratios['Kira_Sertifikasi'],
    'Hisse_Senedi': portfolio_total * target_ratios['Hisse_Senedi']
}

# --- Alt-Fon Dağılımları ---
target_ais = targets_tl['Para_Piyasasi'] * 0.65
target_gpn = targets_tl['Para_Piyasasi'] * 0.35

target_btk = current_balances['BTK']
target_cpu = targets_tl['Teknoloji'] - target_btk

target_kzl = targets_tl['Altin']
target_rbt = targets_tl['Kira_Sertifikasi']
target_rbh = targets_tl['Hisse_Senedi']

print("="*50)
print("--- BUGÜNKÜ GÜNCEL HEDEF TUTARLAR ---")
print("="*50)
print(f"Yeni Toplam Ana Bütçe: {portfolio_total:,.2f} TL\n")
print(f"Hedef AIS (Para): {target_ais:,.2f} TL")
print(f"Hedef GPN (Para): {target_gpn:,.2f} TL")
print(f"Hedef CPU (Teknoloji): {target_cpu:,.2f} TL")
print(f"Hedef BTK (Teknoloji): {target_btk:,.2f} TL")
print(f"Hedef KZL (Altın): {target_kzl:,.2f} TL")
print(f"Hedef RBT (Kira): {target_rbt:,.2f} TL")
print(f"Hedef RBH (Hisse): {target_rbh:,.2f} TL")

# --- Nakit Havuzdan Yapılacak Alım İşlemleri ---
buy_ais = max(0, target_ais - current_balances['AIS'])
buy_gpn = max(0, target_gpn - current_balances['GPN'])
buy_cpu = max(0, target_cpu - current_balances['CPU'])
buy_kzl = max(0, target_kzl - current_balances['KZL'])
buy_rbt = max(0, target_rbt - current_balances['RBT'])
buy_rbh = max(0, target_rbh - current_balances['RBH'])

total_spent = buy_ais + buy_gpn + buy_cpu + buy_kzl + buy_rbt + buy_rbh

# EĞER mevcut fonlardan biri (örn: Teknoloji) hedef oranın çok az üzerindeyse ve yeni alım yapmıyorsak,
# diğer fonları hedeflerine getirmek için gereken para nakit havuzunu biraz aşabilir.
# Bu durumda Para Piyasası (AIS) alımını kısarak nakit havuzu sıfıra eşitliyoruz.
if total_spent > cash_pool:
    shortfall = total_spent - cash_pool
    buy_ais -= shortfall
    total_spent = buy_ais + buy_gpn + buy_cpu + buy_kzl + buy_rbt + buy_rbh

print("\n" + "="*50)
print(f"--- GÜNCEL ALIM EMİRLERİ ({cash_pool:,.2f} TL Nakit Havuzdan) ---")
print("="*50)
print(f"Kullanılabilir Toplam Nakit: {cash_pool:,.2f} TL\n")
print(f"1. AIS'e eklenecek: {buy_ais:,.2f} TL")
print(f"2. GPN'den alınacak: {buy_gpn:,.2f} TL")
print(f"3. CPU'ya eklenecek: {buy_cpu:,.2f} TL")
print(f"4. KZL'ye eklenecek: {buy_kzl:,.2f} TL")
print(f"5. RBT'den alınacak: {buy_rbt:,.2f} TL")
print(f"6. RBH'den alınacak: {buy_rbh:,.2f} TL")

print("-" * 50)
print(f"Toplam Harcanacak Nakit: {total_spent:,.2f} TL")
print(f"Kalan Nakit Bakiyesi: {(cash_pool - total_spent):,.2f} TL")

# --- Final Portfolio Review ---
print("\n" + "="*50)
print("--- REVİZE EDİLMİŞ KUSURSUZ SON PORTFÖY DAĞILIMI ---")
print("="*50)
final_portfolio = {
    'AIS (Para Piyasası)': current_balances['AIS'] + buy_ais,
    'GPN (Para Piyasası)': current_balances['GPN'] + buy_gpn,
    'CPU (Teknoloji)': current_balances['CPU'] + buy_cpu,
    'BTK (Teknoloji)': current_balances['BTK'],
    'RBT (Kira Sertifikası)': current_balances['RBT'] + buy_rbt,
    'KZL (Altın)': current_balances['KZL'] + buy_kzl,
    'RBH (Hisse Senedi)': current_balances['RBH'] + buy_rbh
}

for k, v in final_portfolio.items():
    print(f"{k:25}: {v:10,.2f} TL  ( %{v/portfolio_total*100:05.2f} )")
print("-" * 50)
print(f"{'TOPLAM PORTFÖY':25}: {sum(final_portfolio.values()):10,.2f} TL")
