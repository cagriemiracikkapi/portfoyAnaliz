from typing import Dict, Tuple
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

class PortfolioRebalancer:
    """
    Nakit Akışıyla Portföy Dengeleme Algoritması v5 (RBH Eklenmiş 7'li Dağılım).
    """
    EPSILON = 0.00001

    def __init__(self, target_weights: Dict[str, float]):
        self.target_weights = {str(k): float(v) for k, v in target_weights.items()}
        self._validate_weights(self.target_weights)

    def _validate_weights(self, weights: Dict[str, float]) -> None:
        if not weights:
            raise ValueError("Hedef yüzdeler boş olamaz.")

        total_weight = sum(weights.values())
        if abs(total_weight - 1.0) > 0.0001:
            raise ValueError(
                f"Hedef yüzdelerin toplamı 1.0 (%100) olmalıdır. "
                f"Mevcut toplam: {total_weight:.4f}"
            )

        for fund, weight in weights.items():
            if weight < 0 or weight > 1:
                raise ValueError(f"Geçersiz ağırlık oranı: {fund} -> {weight}")

    def calculate_distribution(
        self,
        current_balances: Dict[str, float],
        new_investment: float
    ) -> Tuple[Dict[str, float], Dict[str, float]]:
        
        new_investment = float(new_investment)
        safe_balances = {str(k): float(v) for k, v in current_balances.items()}

        if new_investment <= 0:
            raise ValueError("Yeni yatırım tutarı 0'dan büyük olmalıdır.")

        if any(value < 0 for value in safe_balances.values()):
            negative_funds = [fund for fund, value in safe_balances.items() if value < 0]
            raise ValueError(f"Negatif bakiye hatası tespit edildi: {negative_funds}")

        total_current_value = sum(safe_balances.values())
        target_total_value = total_current_value + new_investment

        buy_orders = {fund: 0.0 for fund in self.target_weights}
        shortfalls = {fund: 0.0 for fund in self.target_weights}

        if total_current_value == 0:
            for fund, target_weight in self.target_weights.items():
                buy_orders[fund] = round(new_investment * target_weight, 2)
        else:
            for fund, target_weight in self.target_weights.items():
                current_val = safe_balances.get(fund, 0.0)
                target_val = target_total_value * target_weight
                shortfalls[fund] = max(0.0, target_val - current_val)
            total_shortfall = sum(shortfalls.values())

            if total_shortfall > 0:
                for fund, shortfall in shortfalls.items():
                    if shortfall > 0:
                        buy_amount = new_investment * (shortfall / total_shortfall)
                        buy_orders[fund] = round(buy_amount, 2)
            else:
                logging.info("Portföy kusursuz dengede. Yeni nakit hedef oranlara göre dağıtılıyor.")
                for fund, target_weight in self.target_weights.items():
                    buy_orders[fund] = round(new_investment * target_weight, 2)

        total_calculated_buy = sum(buy_orders.values())
        diff = round(new_investment - total_calculated_buy, 2)

        if abs(diff) > 0.001:
            valid_funds_for_diff = [fund for fund, amount in buy_orders.items() if amount > 0]
            if not valid_funds_for_diff:
                valid_funds_for_diff = list(buy_orders.keys())
                
            max_fund = max(valid_funds_for_diff, key=lambda f: buy_orders.get(f, 0))
            buy_orders[max_fund] = round(buy_orders[max_fund] + diff, 2)

        post_investment_balances = {}
        final_buy_total = 0.0
        
        for fund in self.target_weights:
            buy_amt = buy_orders[fund]
            final_buy_total += buy_amt
            post_investment_balances[fund] = safe_balances.get(fund, 0.0) + buy_amt

        if abs(final_buy_total - new_investment) > 0.001:
            raise RuntimeError(
                f"Finansal Uyuşmazlık: Dağıtılan ({final_buy_total:.2f}) != Yatırılan ({new_investment:.2f})"
            )

        return buy_orders, post_investment_balances

# ==========================================
# TEST SENARYOSU (RBH Eklenmiş Haliyle)
# ==========================================
if __name__ == "__main__":
    try:
        # GÜNCELLENMİŞ 7'Lİ YENİ HEDEFLER
        TARGET_PORTFOLIO = {
            'AIS': 0.2913, 
            'GPN': 0.1575, 
            'RBT': 0.1500, 
            'KZL': 0.1500, 
            'CPU': 0.1029, 
            'RBH': 0.1000, 
            'BTK': 0.0483
        }

        print("="*50)
        print("PORTFÖY HESAPLAYICI - ETKİLEŞİMLİ MOD")
        print("="*50)
        print("Lütfen fonların hesabınızdaki güncel TL değerini giriniz.")
        print("(Elinizde o fon henüz yoksa 0 yazıp Enter'a basabilirsiniz.)\n")

        current_balances = {}
        for fund in TARGET_PORTFOLIO.keys():
            while True:
                val = input(f"{fund} fonunun güncel değeri (TL): ").strip()
                if val == "":
                    val = "0"
                try:
                    current_balances[fund] = float(val.replace(',', '.'))
                    break
                except ValueError:
                    print("Hata: Lütfen geçerli bir sayı giriniz (Örn: 15000.50)")
        
        print("\n" + "="*50)
        while True:
            new_money_input = input("Yatırım yapılacak YENİ NAKİT tutarını giriniz (TL): ").strip()
            try:
                new_money = float(new_money_input.replace(',', '.'))
                break
            except ValueError:
                print("Hata: Lütfen geçerli bir tutar giriniz.")

        print("\nHesaplanıyor...\n" + "-"*50)
        rebalancer = PortfolioRebalancer(TARGET_PORTFOLIO)
        buy_orders, final_balances = rebalancer.calculate_distribution(current_balances, new_money)

        print(f"--- {new_money:,.2f} TL YENİ YATIRIM (ALIM) EMİRLERİ ---")
        for fund, amount in buy_orders.items():
            if amount > 0:
                print(f"ALINACAK {fund:5}: {amount:10,.2f} TL")
            else:
                print(f"{fund:14}:       0.00 TL (Zaten hedefte veya üzerinde)")
                
        print("\n--- İŞLEM SONRASI HEDEFLENEN SON PORTFÖY ---")
        total = sum(final_balances.values())
        for fund, amount in final_balances.items():
            print(f"{fund:5}: {amount:12,.2f} TL  ( % {amount/total*100:05.2f} )")
        print("-" * 50)
        print(f"GENEL TOPLAM : {total:,.2f} TL")
                
    except Exception as e:
        logging.error(f"Sistem Hatası: {str(e)}")