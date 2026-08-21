document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let portfolioState = {
        'Para_Piyasasi': { 
            name: 'Para Piyasası', target: 45, 
            funds: [ 
                {code: 'AIS', target: 65, bal: 129463.20}, 
                {code: 'GPN', target: 35, bal: 0} 
            ] 
        },
        'Teknoloji': { 
            name: 'Teknoloji', target: 15, 
            funds: [ 
                {code: 'CPU', target: 68, bal: 65483.80}, 
                {code: 'BTK', target: 32, bal: 30756.91} 
            ] 
        },
        'Altin': { 
            name: 'Altın', target: 15, 
            funds: [ {code: 'KZL', target: 100, bal: 46273.28} ] 
        },
        'Kira_Sertifikasi': { 
            name: 'Kira Sertifikası', target: 15, 
            funds: [ {code: 'RBT', target: 100, bal: 0} ] 
        },
        'Hisse_Senedi': { 
            name: 'Hisse Senedi', target: 10, 
            funds: [ {code: 'RBH', target: 100, bal: 0} ] 
        }
    };

    let allFundsData = []; // From CSV
    let headers = []; // Dynamic headers from CSV
    let sortCol = 7; // Default sort by YBB
    let sortAsc = false;

    // --- ELEMENTS ---
    const container = document.getElementById('categories-container');
    const totalTargetBadge = document.getElementById('total-target-main');
    const calculateBtn = document.getElementById('calculate-btn');
    const errorMsg = document.getElementById('error-msg');
    const cashPoolInput = document.getElementById('cash-pool');
    
    // Results
    const buyOrdersList = document.getElementById('buy-orders-list');
    const finalPortfolioList = document.getElementById('final-portfolio-list');
    const resCash = document.getElementById('res-cash');
    const resTotal = document.getElementById('res-total');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Table
    const tableBody = document.getElementById('table-body');
    const tableHeaderRow = document.getElementById('table-header-row');
    const searchInput = document.getElementById('fund-search');
    const columnTogglesContainer = document.getElementById('column-toggles');

    // Modal
    const modal = document.getElementById('add-fund-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    let pendingFundCode = null;

    // --- HELPERS ---
    const formatMoney = (amount) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    // --- TAB LOGIC (With Persistence) ---
    let activeTab = localStorage.getItem('activeTab') || 'tab-rebalancer';
    
    // Set initial active tab
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    const activeBtn = document.querySelector(`[data-tab="${activeTab}"]`);
    if(activeBtn) {
        activeBtn.classList.add('active');
        document.getElementById(activeTab).classList.add('active');
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetTab = btn.dataset.tab;
            document.getElementById(targetTab).classList.add('active');
            localStorage.setItem('activeTab', targetTab);
        });
    });

    // --- DROPDOWN LOGIC ---
    const filterBtn = document.getElementById('filter-dropdown-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            columnTogglesContainer.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!columnTogglesContainer.contains(e.target) && e.target !== filterBtn) {
                columnTogglesContainer.classList.remove('show');
            }
        });
    }

    // --- RENDER DYNAMIC PORTFOLIO UI ---
    function renderPortfolioUI() {
        container.innerHTML = '';
        let mainTargetSum = 0;
        let hasError = false;

        Object.keys(portfolioState).forEach(catKey => {
            const cat = portfolioState[catKey];
            mainTargetSum += cat.target;

            let subTargetSum = 0;
            cat.funds.forEach(f => subTargetSum += f.target);
            const isSubTargetValid = Math.abs(subTargetSum - 100) < 0.1;
            if(!isSubTargetValid && cat.funds.length > 0) hasError = true;

            const catDiv = document.createElement('div');
            catDiv.className = 'category-block';
            
            let fundsHTML = cat.funds.map((f, idx) => `
                <div class="fund-row">
                    <div>
                        <label>Fon Kodu</label>
                        <span class="fund-code-label">${f.code}</span>
                    </div>
                    <div>
                        <label>Bakiye (TL)</label>
                        <input type="number" value="${f.bal}" step="0.01" class="dyn-bal" data-cat="${catKey}" data-idx="${idx}">
                    </div>
                    <div>
                        <label>İçi Yüzde (%)</label>
                        <input type="number" value="${f.target}" step="0.1" max="100" class="dyn-pct" data-cat="${catKey}" data-idx="${idx}">
                    </div>
                    <button type="button" class="btn-icon delete-fund" data-cat="${catKey}" data-idx="${idx}" title="Sil">×</button>
                </div>
            `).join('');

            catDiv.innerHTML = `
                <div class="category-header">
                    <h3>${cat.name}</h3>
                    <div class="cat-target-wrap">
                        <label>Ana Hedef %</label>
                        <input type="number" value="${cat.target}" class="cat-target" data-cat="${catKey}">
                    </div>
                </div>
                ${!isSubTargetValid && cat.funds.length > 0 ? `<span class="cat-error">Hata: Kategori içi toplam %${subTargetSum.toFixed(1)}, %100 olmalı!</span>` : ''}
                <div class="fund-list">${fundsHTML}</div>
                <button type="button" class="add-fund-btn" data-cat="${catKey}">+ FARKLI BİR FON EKLE</button>
            `;
            container.appendChild(catDiv);
        });

        // Validate Main Sum
        totalTargetBadge.textContent = `Kategori Toplamı: % ${mainTargetSum.toFixed(1)}`;
        if (Math.abs(mainTargetSum - 100) > 0.1) {
            totalTargetBadge.className = 'badge badge-red';
            hasError = true;
        } else {
            totalTargetBadge.className = 'badge badge-green';
        }

        errorMsg.textContent = hasError ? "Lütfen kırmızı ile belirtilen yüzdelik hatalarını düzeltin." : "";
        calculateBtn.disabled = hasError;

        attachUIListeners();
    }

    function attachUIListeners() {
        document.querySelectorAll('.cat-target').forEach(inp => {
            inp.addEventListener('change', (e) => {
                portfolioState[e.target.dataset.cat].target = parseFloat(e.target.value) || 0;
                renderPortfolioUI();
            });
        });
        document.querySelectorAll('.dyn-bal').forEach(inp => {
            inp.addEventListener('change', (e) => {
                portfolioState[e.target.dataset.cat].funds[e.target.dataset.idx].bal = parseFloat(e.target.value) || 0;
            });
        });
        document.querySelectorAll('.dyn-pct').forEach(inp => {
            inp.addEventListener('change', (e) => {
                portfolioState[e.target.dataset.cat].funds[e.target.dataset.idx].target = parseFloat(e.target.value) || 0;
                renderPortfolioUI();
            });
        });
        document.querySelectorAll('.delete-fund').forEach(btn => {
            btn.addEventListener('click', (e) => {
                portfolioState[e.target.dataset.cat].funds.splice(e.target.dataset.idx, 1);
                renderPortfolioUI();
            });
        });
        document.querySelectorAll('.add-fund-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Switching to Market tab to select a fund
                document.querySelector('[data-tab="tab-market"]').click();
                searchInput.focus();
            });
        });
    }

    // --- REBALANCER ALGORITHM ---
    calculateBtn.addEventListener('click', () => {
        const newCash = parseFloat(cashPoolInput.value) || 0;
        
        let currentTotal = 0;
        let flatFunds = [];
        
        // Flatten array and get total current
        Object.keys(portfolioState).forEach(catKey => {
            portfolioState[catKey].funds.forEach(f => {
                currentTotal += f.bal;
                flatFunds.push({...f, catWeight: portfolioState[catKey].target / 100, catKey: catKey});
            });
        });

        const targetPortfolioValue = currentTotal + newCash;
        let buyOrders = {};
        
        flatFunds.forEach(f => {
            // Formula: Total * (Category %) * (SubFund %)
            const targetTL = targetPortfolioValue * f.catWeight * (f.target / 100);
            buyOrders[f.code] = Math.max(0, targetTL - f.bal);
        });

        let totalSpent = Object.values(buyOrders).reduce((a, b) => a + b, 0);

        // Adjust via AIS if needed (buffer fund)
        if (totalSpent > newCash && buyOrders['AIS']) {
            const shortfall = totalSpent - newCash;
            buyOrders['AIS'] = Math.max(0, buyOrders['AIS'] - shortfall);
            totalSpent = Object.values(buyOrders).reduce((a, b) => a + b, 0);
        }

        // Render Results
        buyOrdersList.innerHTML = '';
        resCash.textContent = `Kullanılan Nakit: ${formatMoney(totalSpent)} TL`;

        // Render Buy Orders
        flatFunds.forEach(f => {
            const amt = buyOrders[f.code];
            const div = document.createElement('div');
            div.className = 'result-item';
            if (amt > 0) {
                div.innerHTML = `<div><div class="fund-name">${f.code}</div><div class="fund-meta">${portfolioState[f.catKey].name}</div></div><div class="fund-amount">+ ${formatMoney(amt)} TL</div>`;
            } else {
                div.innerHTML = `<div><div class="fund-name" style="color:var(--text-muted)">${f.code}</div><div class="fund-meta">${portfolioState[f.catKey].name}</div></div><div class="fund-amount zero">Ekleme Yok</div>`;
            }
            buyOrdersList.appendChild(div);
        });

        // Render Final
        finalPortfolioList.innerHTML = '';
        const finalTotal = currentTotal + totalSpent;
        resTotal.textContent = `Toplam Portföy: ${formatMoney(finalTotal)} TL`;

        let finalArr = flatFunds.map(f => ({
            code: f.code,
            amount: f.bal + buyOrders[f.code]
        })).sort((a, b) => b.amount - a.amount);

        finalArr.forEach(f => {
            const pct = finalTotal > 0 ? ((f.amount / finalTotal) * 100).toFixed(2) : 0;
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<div><div class="fund-name">${f.code} <span class="badge" style="margin-left: 10px">% ${pct}</span></div></div><div class="fund-amount" style="color:var(--text-main)">${formatMoney(f.amount)} TL</div>`;
            finalPortfolioList.appendChild(div);
        });
    });

    // --- FON PİYASASI (CSV) LOGIC ---
    
    function parseNumberStr(str) {
        if(!str) return -999999;
        return parseFloat(str.replace(',', '.')) || -999999;
    }

    function renderTable() {
        const query = searchInput.value.toLowerCase();
        
        // Filter
        let filtered = allFundsData.filter(row => {
            return row[0].toLowerCase().includes(query) || row[1].toLowerCase().includes(query);
        });

        // Sort
        filtered.sort((a, b) => {
            let valA = a[sortCol];
            let valB = b[sortCol];
            // If sort col is numeric (4 to 8 are percentages, 3 is risk)
            if(sortCol >= 3 && sortCol <= 8) {
                valA = parseNumberStr(valA);
                valB = parseNumberStr(valB);
            } else {
                valA = valA || ""; valB = valB || "";
            }
            
            if(valA < valB) return sortAsc ? -1 : 1;
            if(valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });

        // Render Header
        tableHeaderRow.innerHTML = headers.map((h, i) => {
            const isHidden = !document.querySelector(`#column-toggles input[value="${i}"]`).checked;
            if(isHidden) return '';
            let arrow = sortCol === i ? (sortAsc ? ' ↑' : ' ↓') : '';
            return `<th data-col="${i}">${h}${arrow}</th>`;
        }).join('') + '<th>İşlem</th>';

        // Bind Sort Events
        tableHeaderRow.querySelectorAll('th[data-col]').forEach(th => {
            th.addEventListener('click', () => {
                const col = parseInt(th.dataset.col);
                if(sortCol === col) sortAsc = !sortAsc;
                else { sortCol = col; sortAsc = false; }
                renderTable();
            });
        });

        // Render Body
        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" class="empty-state">Kayıt bulunamadı.</td></tr>`;
            return;
        }

        tableBody.innerHTML = filtered.map(row => {
            let html = '';
            headers.forEach((_, i) => {
                const isHidden = !document.querySelector(`#column-toggles input[value="${i}"]`).checked;
                if(!isHidden) html += `<td>${row[i] || '-'}</td>`;
            });
            html += `<td><button type="button" class="add-from-table-btn" data-code="${row[0]}">+ Ekle</button></td>`;
            return `<tr>${html}</tr>`;
        }).join('');

        // Bind Add Buttons
        document.querySelectorAll('.add-from-table-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                pendingFundCode = e.target.dataset.code;
                document.getElementById('modal-fund-title').textContent = `${pendingFundCode} Fonunu Ekle`;
                modal.classList.add('show');
            });
        });
    }

    searchInput.addEventListener('input', renderTable);

    // Parse CSV from global variable (bypasses CORS)
    Papa.parse(csvRawData, {
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            headers = results.data.shift(); // First row is headers
            allFundsData = results.data;
            
            // Default active columns
            const defaultCols = ['Fon Kodu', 'Fon Adı', 'Şemsiye Fon Türü', 'Fonun Risk Değeri', '1 Ay (%)', 'Yılbaşından İtibaren (%)', '1 Yıl (%)'];
            
            // Build toggles
            columnTogglesContainer.innerHTML = headers.map((h, i) => {
                const isChecked = defaultCols.includes(h) ? 'checked' : '';
                return `<label><input type="checkbox" ${isChecked} value="${i}"> ${h}</label>`;
            }).join('');
            
            // Bind Toggles
            document.querySelectorAll('#column-toggles input').forEach(chk => {
                chk.addEventListener('change', renderTable);
            });
            
            renderTable();
        }
    });

    // --- MODAL LOGIC ---
    closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
    modalSaveBtn.addEventListener('click', () => {
        const catKey = document.getElementById('modal-category').value;
        const targetPct = parseFloat(document.getElementById('modal-target-pct').value) || 0;
        const bal = parseFloat(document.getElementById('modal-balance').value) || 0;

        portfolioState[catKey].funds.push({
            code: pendingFundCode,
            target: targetPct,
            bal: bal
        });

        modal.classList.remove('show');
        renderPortfolioUI();
        document.querySelector('[data-tab="tab-rebalancer"]').click(); // switch tab back
        
        // Reset inputs
        document.getElementById('modal-target-pct').value = "0";
        document.getElementById('modal-balance').value = "0";
    });

    // Initial render
    renderPortfolioUI();
});
