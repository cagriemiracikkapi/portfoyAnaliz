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
        'Coklu_Varlik': {
            name: 'Çoklu Varlık', target: 0,
            funds: []
        },
        'Hisse_Senedi': { 
            name: 'Hisse Senedi', target: 10, 
            funds: [ {code: 'RBH', target: 100, bal: 0} ] 
        },
        'Birinci_Katilim': {
            name: 'Birinci Katılım', target: 0,
            funds: []
        },
        'Diger': {
            name: 'Diğer', target: 0,
            funds: []
        }
    };

    let categoryOrder = JSON.parse(localStorage.getItem('categoryOrder')) || Object.keys(portfolioState);
    Object.keys(portfolioState).forEach(k => {
        if(!categoryOrder.includes(k)) categoryOrder.push(k);
    });
    categoryOrder = categoryOrder.filter(k => portfolioState[k]);

    let allFundsData = []; // From CSV
    let headers = []; // Dynamic headers from CSV
    let activeFilters = JSON.parse(localStorage.getItem('activeFilters')) || []; // Advanced Rules from storage
    let currentFilteredData = []; // Kept for export
    let sortCol = 7; // Default sort by YBB
    let sortAsc = false;
    
    // Pagination
    let currentPage = 1;
    const rowsPerPage = 15;

    // --- ELEMENTS ---
    const container = document.getElementById('categories-container');
    
    // Live Drag and Drop sorting
    container.addEventListener('dragover', e => {
        e.preventDefault();
        
        // Auto-scroll
        const threshold = 80;
        if (e.clientY < threshold) {
            window.scrollBy(0, -15);
        } else if (e.clientY > window.innerHeight - threshold) {
            window.scrollBy(0, 15);
        }
        
        const draggable = document.querySelector('.dragging');
        if (!draggable) return;
        
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.category-block:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    const hideEmptyCatsCheckbox = document.getElementById('hide-empty-cats');
    let hideEmptyCategories = localStorage.getItem('hideEmptyCategories') === 'true';
    if (hideEmptyCatsCheckbox) {
        hideEmptyCatsCheckbox.checked = hideEmptyCategories;
        hideEmptyCatsCheckbox.addEventListener('change', (e) => {
            hideEmptyCategories = e.target.checked;
            localStorage.setItem('hideEmptyCategories', hideEmptyCategories);
            renderPortfolioUI();
        });
    }

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

        categoryOrder.forEach(catKey => {
            const cat = portfolioState[catKey];
            mainTargetSum += cat.target;

            let subTargetSum = 0;
            cat.funds.forEach(f => subTargetSum += f.target);
            const isSubTargetValid = Math.abs(subTargetSum - 100) < 0.1;
            if(!isSubTargetValid && cat.funds.length > 0) hasError = true;

            // Render check
            if (hideEmptyCategories && cat.funds.length === 0) return;

            const catDiv = document.createElement('div');
            catDiv.className = 'category-block';
            catDiv.dataset.catKey = catKey;
            
            catDiv.addEventListener('mousedown', function(e) {
                if (e.target.closest('.drag-handle')) {
                    this.setAttribute('draggable', 'true');
                } else {
                    this.removeAttribute('draggable');
                }
            });
            
            catDiv.addEventListener('dragstart', function(e) {
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => this.style.opacity = '0.1', 0);
            });
            
            catDiv.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                this.style.opacity = '1';
                
                // Save new order based on interactive DOM changes
                const newOrder = [...container.querySelectorAll('.category-block')].map(el => el.dataset.catKey);
                categoryOrder = newOrder;
                localStorage.setItem('categoryOrder', JSON.stringify(categoryOrder));
            });
            
            let fundsHTML = cat.funds.map((f, idx) => `
                <div class="fund-row">
                    <div>
                        <label>Fon Kodu</label>
                        <span class="fund-code-label fund-hover-trigger" data-code="${f.code}">${f.code}</span>
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
                    <div style="display:flex; align-items:center;">
                        <span class="drag-handle" title="Tutup sürükleyin">⠿</span>
                        <h3 style="margin:0">${cat.name}</h3>
                    </div>
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
                const catKey = e.target.dataset.cat;
                const catName = portfolioState[catKey].name;
                
                // Switch tab
                document.querySelector('[data-tab="tab-market"]').click();
                
                // Clear existing Kategori filters
                const catColIdx = headers.indexOf('Kategori Tagı');
                if (catColIdx > -1) {
                    activeFilters = activeFilters.filter(f => f.colIdx !== catColIdx);
                    
                    // Add new Kategori filter
                    activeFilters.push({
                        colIdx: catColIdx,
                        colName: 'Kategori Tagı',
                        op: '=',
                        v1: catName,
                        v2: ''
                    });
                    
                    currentPage = 1;
                    renderActiveFilters();
                    renderTable();
                }
            });
        });
    }

    // --- REBALANCER ALGORITHM ---
    calculateBtn.addEventListener('click', () => {
        const newCash = parseFloat(cashPoolInput.value) || 0;
        
        let currentTotal = 0;
        let flatFunds = [];
        
        // Flatten array and get total current using ordered keys
        categoryOrder.forEach(catKey => {
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

    // --- ADVANCED FILTERS LOGIC ---
    let editingFilterIndex = null;
    const advFilterBtn = document.getElementById('advanced-filter-btn');
    const advFilterPanel = document.getElementById('advanced-filter-panel');
    const ruleColSelect = document.getElementById('rule-col');
    const ruleOpSelect = document.getElementById('rule-op');
    const ruleVal1 = document.getElementById('rule-val1');
    const ruleVal2 = document.getElementById('rule-val2');
    const addRuleBtn = document.getElementById('add-rule-btn');
    const activeRulesList = document.getElementById('active-rules-list');
    const exportCsvBtn = document.getElementById('export-csv-btn');

    if (advFilterBtn) {
        advFilterBtn.addEventListener('click', () => {
            advFilterPanel.style.display = advFilterPanel.style.display === 'none' ? 'block' : 'none';
        });

        ruleOpSelect.addEventListener('change', () => {
            if (ruleOpSelect.value === 'between') {
                ruleVal2.style.display = 'block';
            } else {
                ruleVal2.style.display = 'none';
            }
        });

        addRuleBtn.addEventListener('click', () => {
            const colIdx = parseInt(ruleColSelect.value);
            const op = ruleOpSelect.value;
            const v1 = ruleVal1.value;
            const v2 = ruleVal2.value;

            if (!v1) return;

            const newRule = {
                colIdx: colIdx,
                colName: headers[colIdx],
                op: op,
                v1: v1,
                v2: v2
            };

            if (editingFilterIndex !== null) {
                activeFilters[editingFilterIndex] = newRule;
                editingFilterIndex = null;
                addRuleBtn.textContent = "+ Kural Ekle";
            } else {
                activeFilters.push(newRule);
            }

            ruleVal1.value = '';
            ruleVal2.value = '';
            currentPage = 1; // Reset pagination
            renderActiveFilters();
            renderTable();
        });
    }

    function renderActiveFilters() {
        localStorage.setItem('activeFilters', JSON.stringify(activeFilters));
        
        activeRulesList.innerHTML = activeFilters.map((f, i) => {
            let desc = '';
            if (f.op === 'between') desc = `${f.colName} şunlar arasında: ${f.v1} - ${f.v2}`;
            else if (f.op === 'contains') desc = `${f.colName} içerir: "${f.v1}"`;
            else desc = `${f.colName} ${f.op} ${f.v1}`;
            
            return `
                <div class="active-rule-item">
                    <span>${desc}</span>
                    <div style="display:flex; gap:0.5rem;">
                        <button type="button" data-idx="${i}" class="edit-rule-btn">✏️</button>
                        <button type="button" data-idx="${i}" class="remove-rule-btn">&times;</button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.remove-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                activeFilters.splice(e.target.dataset.idx, 1);
                
                // If the deleted rule was being edited, cancel edit
                if (editingFilterIndex === parseInt(e.target.dataset.idx)) {
                    editingFilterIndex = null;
                    addRuleBtn.textContent = "+ Kural Ekle";
                    ruleVal1.value = '';
                    ruleVal2.value = '';
                }
                
                currentPage = 1; // Reset pagination
                renderActiveFilters();
                renderTable();
            });
        });

        document.querySelectorAll('.edit-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const f = activeFilters[idx];
                
                ruleColSelect.value = f.colIdx;
                ruleOpSelect.value = f.op;
                ruleVal1.value = f.v1;
                ruleVal2.value = f.v2 || '';
                
                ruleOpSelect.dispatchEvent(new Event('change')); // show/hide ruleVal2
                
                editingFilterIndex = idx;
                addRuleBtn.textContent = "✓ Kuralı Güncelle";
            });
        });
    }

    exportCsvBtn.addEventListener('click', () => {
        if (currentFilteredData.length === 0) return;
        
        // Sadece görünür sütunları dışa aktaralım
        const visibleCols = [];
        document.querySelectorAll('#column-toggles input').forEach(chk => {
            if(chk.checked) visibleCols.push(parseInt(chk.value));
        });

        const exportData = [visibleCols.map(c => headers[c])]; // Header row
        
        currentFilteredData.forEach(row => {
            exportData.push(visibleCols.map(c => row[c] || ''));
        });

        const csvString = Papa.unparse(exportData);
        const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Tefas_Filtrelenmis_Liste.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- TABLE & CSV PARSING ---
    function computeCategory(fundName, umbrellaType) {
        fundName = (fundName || "").toLocaleLowerCase('tr-TR');
        umbrellaType = (umbrellaType || "").toLocaleLowerCase('tr-TR');
        
        for (const key in portfolioState) {
            const catName = portfolioState[key].name.toLocaleLowerCase('tr-TR');
            let aliases = [catName];
            if (key === 'Altin') aliases.push('kıymetli maden', 'altın');
            if (key === 'Hisse_Senedi') aliases.push('hisse senedi');
            if (key === 'Kira_Sertifikasi') aliases.push('kira sertifikası', 'kira sertifikaları', 'kira sertifika');
            if (key === 'Para_Piyasasi') aliases.push('para piyasası');
            if (key === 'Teknoloji') aliases.push('teknoloji', 'bilişim', 'yarı iletken');
            if (key === 'Coklu_Varlik') aliases.push('çoklu varlık');
            if (key === 'Birinci_Katilim') aliases.push('birinci katılım', 'birinci kat');
            
            for (let alias of aliases) {
                if (fundName.includes(alias) || umbrellaType.includes(alias)) {
                    return portfolioState[key].name;
                }
            }
        }
        return 'Diğer';
    }

    function parseNumberStr(str) {
        if(!str) return -999999;
        return parseFloat(str.replace(',', '.')) || -999999;
    }

    function renderTable() {
        const query = searchInput.value.toLocaleLowerCase('tr-TR');
        
        // Filter (Search + Advanced Rules)
        let filtered = allFundsData.filter(row => {
            // Text Search
            const matchSearch = (row[0] || "").toLocaleLowerCase('tr-TR').includes(query) || (row[1] || "").toLocaleLowerCase('tr-TR').includes(query);
            if (!matchSearch) return false;

            // Advanced Rules (AND logic)
            for (let filter of activeFilters) {
                let cellVal = row[filter.colIdx];
                let isNumCol = (filter.colIdx >= 3 && filter.colIdx <= 16) || (filter.colIdx > 17 && filter.colIdx !== headers.indexOf('Kategori Tagı'));
                
                if (filter.op === 'contains') {
                    if (!(cellVal || "").toLocaleLowerCase('tr-TR').includes(filter.v1.toLocaleLowerCase('tr-TR'))) return false;
                } else if (!isNumCol && filter.op === '=') {
                    // Exact string match
                    if ((cellVal || "").toLocaleLowerCase('tr-TR') !== (filter.v1 || "").toLocaleLowerCase('tr-TR')) return false;
                } else {
                    let numVal = parseNumberStr(cellVal);
                    let v1 = parseFloat(filter.v1.replace(',', '.')) || 0;
                    
                    if (filter.op === '>') {
                        if (numVal <= v1) return false;
                    } else if (filter.op === '<') {
                        if (numVal >= v1) return false;
                    } else if (filter.op === '=') {
                        if (numVal !== v1) return false;
                    } else if (filter.op === 'between') {
                        let v2 = parseFloat(filter.v2.replace(',', '.')) || 0;
                        let min = Math.min(v1, v2);
                        let max = Math.max(v1, v2);
                        if (numVal < min || numVal > max) return false;
                    }
                }
            }
            return true;
        });

        // Store for export
        currentFilteredData = filtered;

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

        // Pagination
        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        
        const startIndex = (currentPage - 1) * rowsPerPage;
        const paginatedData = filtered.slice(startIndex, startIndex + rowsPerPage);

        // Render Header
        tableHeaderRow.innerHTML = '<th>İşlem</th>' + headers.map((h, i) => {
            const toggle = document.querySelector(`#column-toggles input[value="${i}"]`);
            const isHidden = toggle ? !toggle.checked : false;
            if(isHidden) return '';
            const isSorted = sortCol === i;
            const sortIcon = isSorted ? (sortAsc ? ' 🔼' : ' 🔽') : '';
            return `<th data-col="${i}" style="cursor:pointer">${h}${sortIcon}</th>`;
        }).join('');

        // Bind Sort Events
        tableHeaderRow.querySelectorAll('th[data-col]').forEach(th => {
            th.addEventListener('click', () => {
                const col = parseInt(th.dataset.col);
                if(sortCol === col) sortAsc = !sortAsc;
                else { sortCol = col; sortAsc = false; }
                currentPage = 1;
                renderTable();
            });
        });

        const fundCountBadge = document.getElementById('fund-count-badge');
        if (fundCountBadge) {
            fundCountBadge.textContent = `${filtered.length} Fon Listelendi`;
        }

        // Render Body
        if (paginatedData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" class="empty-state">Kayıt bulunamadı.</td></tr>`;
            document.getElementById('pagination-controls').innerHTML = '';
            return;
        }

        tableBody.innerHTML = paginatedData.map(row => {
            const catColIdx = headers.indexOf('Kategori Tagı');
            const rowCatName = row[catColIdx];
            let rowCatKey = '';
            for (const k in portfolioState) {
                if (portfolioState[k].name === rowCatName) rowCatKey = k;
            }
            
            let html = `<td><button type="button" class="add-from-table-btn" data-code="${row[0]}" data-cat="${rowCatKey}">+ Ekle</button></td>`;
            headers.forEach((_, i) => {
                const toggle = document.querySelector(`#column-toggles input[value="${i}"]`);
                const isHidden = toggle ? !toggle.checked : false;
                if(!isHidden) {
                    if (i === catColIdx) {
                        html += `<td><span class="badge" style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.3)">${row[i]}</span></td>`;
                    } else if (i === 0) {
                        html += `<td><span class="fund-hover-trigger" data-code="${row[0]}">${row[0]}</span></td>`;
                    } else {
                        html += `<td>${row[i] || '-'}</td>`;
                    }
                }
            });
            return `<tr>${html}</tr>`;
        }).join('');

        // Bind Add Buttons
        document.querySelectorAll('.add-from-table-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                pendingFundCode = e.target.dataset.code;
                document.getElementById('modal-fund-title').textContent = `${pendingFundCode} Fonunu Ekle`;
                
                const targetCat = e.target.dataset.cat;
                const catSelect = document.getElementById('modal-category');
                if (targetCat && document.querySelector(`#modal-category option[value="${targetCat}"]`)) {
                    catSelect.value = targetCat;
                }
                
                modal.classList.add('show');
            });
        });

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        const paginationContainer = document.getElementById('pagination-controls');
        if (!paginationContainer) return;
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="window.changePage(${currentPage - 1})">Önceki</button>`;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            html += `<button class="page-btn" onclick="window.changePage(1)">1</button>`;
            if (startPage > 2) html += `<span>...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.changePage(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span>...</span>`;
            html += `<button class="page-btn" onclick="window.changePage(${totalPages})">${totalPages}</button>`;
        }
        
        html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.changePage(${currentPage + 1})">Sonraki</button>`;
        
        paginationContainer.innerHTML = html;
    }
    
    window.changePage = function(page) {
        currentPage = page;
        renderTable();
    };

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderTable();
    });

    // Parse CSV from global variable (bypasses CORS)
    Papa.parse(csvRawData, {
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            headers = results.data.shift(); // First row is headers
            
            headers.push("Kategori Tagı");
            const catColIdx = headers.length - 1;
            
            allFundsData = results.data.map(row => {
                row.push(computeCategory(row[1], row[2]));
                return row;
            });
            
            // Default active columns
            const defaultCols = ['Fon Kodu', 'Fon Adı', 'Kategori Tagı', 'Fonun Risk Değeri', '1 Ay (%)', 'Yılbaşından İtibaren (%)', '1 Yıl (%)'];
            
            // Build toggles and Dropdown Options
            let togglesHTML = '';
            let optionsHTML = '';
            
            headers.forEach((h, i) => {
                const isChecked = defaultCols.includes(h) ? 'checked' : '';
                togglesHTML += `<label><input type="checkbox" ${isChecked} value="${i}"> ${h}</label>`;
                optionsHTML += `<option value="${i}">${h}</option>`;
            });
            
            columnTogglesContainer.innerHTML = togglesHTML;
            if (ruleColSelect) ruleColSelect.innerHTML = optionsHTML;
            
            // Bind Toggles
            document.querySelectorAll('#column-toggles input').forEach(chk => {
                chk.addEventListener('change', () => {
                    currentPage = 1;
                    renderTable();
                });
            });
            
            renderActiveFilters(); // Render loaded filters
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

    // --- GLOBAL TOOLTIP LOGIC ---
    const tooltip = document.createElement('div');
    tooltip.id = 'global-tooltip';
    tooltip.className = 'glass-tooltip';
    document.body.appendChild(tooltip);

    document.body.addEventListener('mousemove', (e) => {
        const trigger = e.target.closest('.fund-hover-trigger');
        if (!trigger) {
            tooltip.classList.remove('show');
            return;
        }
        
        const code = trigger.dataset.code;
        const fund = allFundsData.find(r => r[0] === code);
        if (!fund) return;
        
        const risk = fund[3] || '-';
        const ybb = fund[6] || '0';
        const oneYear = fund[7] || '0';
        const fiveYear = fund[9] || '0';
        
        tooltip.innerHTML = `
            <h4>${code} - ${fund[1]}</h4>
            <p><span>Kategori:</span> <span class="val">${fund[2]}</span></p>
            <p><span>Risk Değeri:</span> <span class="val">${risk}</span></p>
            <p><span>Yılbaşı Getirisi:</span> <span class="val" style="color:var(--accent-green)">%${ybb}</span></p>
            <p><span>1 Yıllık Getiri:</span> <span class="val" style="color:var(--accent-green)">%${oneYear}</span></p>
            <p><span>5 Yıllık Getiri:</span> <span class="val" style="color:var(--accent-green)">%${fiveYear}</span></p>
        `;
        
        // Position relative to cursor
        let left = e.clientX + 15;
        let top = e.clientY + 15;
        
        // Keep tooltip strictly inside viewport
        const rect = tooltip.getBoundingClientRect();
        if (left + 320 > window.innerWidth) left = e.clientX - 335;
        if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.add('show');
    });

    // Initial render
    renderPortfolioUI();
});
