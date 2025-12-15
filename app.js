/**
 * Painel de Empréstimos - JS Logic
 * v3.1 - Com limpeza de órfãos e correção de sintaxe
 */

// --- Estrutura de Dados ---
let dbDebtors = [];
let dbLoans = [];
let dbCards = [];

// --- Inicialização ---

function init() {
    loadData();
    cleanOrphanLoans(); // Remove "Removido" entries automatically
    populateDebtorSelect();
    populateCardDueDayFilter();
    populateDueDateExactFilter(); // New
    setupListeners();
    updateUI();
}

function loadData() {
    const savedDebtors = localStorage.getItem('painel_devedores_db');
    const savedLoans = localStorage.getItem('painel_emprestimos_v3_db');
    const savedCards = localStorage.getItem('painel_cartoes_db');

    if (savedDebtors) dbDebtors = JSON.parse(savedDebtors);
    if (savedCards) dbCards = JSON.parse(savedCards);
    if (savedLoans) dbLoans = JSON.parse(savedLoans);

    if (!savedLoans) {
        const oldData = localStorage.getItem('painel_emprestimos_db');
        if (oldData) {
            migrateData(JSON.parse(oldData));
        } else {
            // Mock inicial APENAS se não houver devedores
            if (dbDebtors.length === 0) {
                const newDebtor = { id: Date.now(), name: "Exemplo", phone: "11999999999", notes: "Novo" };
                dbDebtors.push(newDebtor);
                // Não criar empréstimo mock para evitar sujeira
                saveData();
            }
        }
    }
}

// Limpa empréstimos sem devedor (Orphans)
function cleanOrphanLoans() {
    const initialCount = dbLoans.length;
    // Mantém apenas empréstimos cujo debtorId existe em dbDebtors
    dbLoans = dbLoans.filter(l => dbDebtors.some(d => d.id === l.debtorId));

    if (dbLoans.length !== initialCount) {
        console.log(`Cleaned ${initialCount - dbLoans.length} orphan loans.`);
        saveData(); // Salva a limpeza
    }
}

function migrateData(oldList) {
    oldList.forEach(item => {
        const debtorId = item.id;
        const debtor = {
            id: debtorId,
            name: item.creditor || "Desconhecido",
            phone: item.phone || "",
            notes: item.notes || ""
        };
        dbDebtors.push(debtor);

        const loan = {
            id: item.id + "_loan",
            debtorId: debtorId,
            type: item.type,
            totalValue: item.totalValue,
            installmentsCount: item.installmentsCount,
            installments: item.installments.map(i => {
                // Migration logic for existing entries
                const paidVal = i.status === 'Pago' ? i.value : 0;
                return { ...i, paidValue: paidVal };
            }),
            startDate: item.startDate,
            desc: item.notes || ""
        };
        dbLoans.push(loan);
    });
    saveData();
}

function saveData() {
    localStorage.setItem('painel_devedores_db', JSON.stringify(dbDebtors));
    localStorage.setItem('painel_emprestimos_v3_db', JSON.stringify(dbLoans));
    localStorage.setItem('painel_cartoes_db', JSON.stringify(dbCards));
    // updateUI é chamado por quem edita dados, ou init
}

// --- DOM Elements ---

const dom = {
    body: document.getElementById('loansTableBody'),
    inputSearch: document.getElementById('filterSearch'),
    filterDebtor: document.getElementById('filterDebtor'),
    filterCardDueDay: document.getElementById('filterCardDueDay'),
    filterType: document.getElementById('filterType'),
    filterStatus: document.getElementById('filterStatus'),
    filterDueDateExact: document.getElementById('filterDueDateExact'), // New
    filterDateStart: document.getElementById('filterDateStart'),
    filterDateEnd: document.getElementById('filterDateEnd'),
    emptyState: document.getElementById('emptyState'),

    kpiEmprestado: document.getElementById('kpiTotalEmprestado'),
    kpiRecebido: document.getElementById('kpiTotalRecebido'),
    kpiPendente: document.getElementById('kpiTotalPendente'),

    // Inputs
    inpLoanDebtor: document.getElementById('inpLoanDebtor'),
    divLoanCard: document.getElementById('divLoanCard'),
    inpLoanType: document.getElementById('inpLoanType'),
    inpLoanCard: document.getElementById('inpLoanCard'),
    inpLoanPurchaseDate: document.getElementById('inpLoanPurchaseDate'),
    inpLoanDate: document.getElementById('inpLoanDate'),
    inpLoanValue: document.getElementById('inpLoanValue'),
    inpLoanInstallments: document.getElementById('inpLoanInstallments'),
    inpLoanDesc: document.getElementById('inpLoanDesc'),
    formNewLoan: document.getElementById('newLoanForm'),

    // Inputs Card
    inpCardName: document.getElementById('inpCardName'),
    inpCardLast4: document.getElementById('inpCardLast4'),
    inpCardDueDay: document.getElementById('inpCardDueDay'),

    // Report
    inpReportDebtor: document.getElementById('inpReportDebtor'),

    // Buttons
    btnNewLoan: document.getElementById('btnNewLoan'),
    btnReport: document.getElementById('btnReport')
};

function setupListeners() {
    dom.filterDebtor.addEventListener('change', updateUI);
    dom.filterCardDueDay.addEventListener('change', updateUI);
    if (dom.filterType) dom.filterType.addEventListener('change', updateUI);
    if (dom.filterStatus) dom.filterStatus.addEventListener('change', updateUI);
    if (dom.filterDueDateExact) dom.filterDueDateExact.addEventListener('change', updateUI);
    if (dom.filterDateStart) dom.filterDateStart.addEventListener('change', updateUI);
    if (dom.filterDateEnd) dom.filterDateEnd.addEventListener('change', updateUI);
    if (dom.inputSearch) dom.inputSearch.addEventListener('input', updateUI);

    const btnExport = document.getElementById('btnExport');
    if (btnExport) btnExport.addEventListener('click', () => openModal('exportModal'));

    const btnBilling = document.getElementById('btnBilling');
    if (btnBilling) btnBilling.addEventListener('click', openBillingModal);

    // Modais Buttons

    if (dom.btnNewLoan) {
        dom.btnNewLoan.onclick = () => {
            populateDebtorSelect();
            populateCardSelect();
            if (dom.inpLoanDate) dom.inpLoanDate.valueAsDate = new Date();
            if (dom.inpLoanPurchaseDate) dom.inpLoanPurchaseDate.valueAsDate = new Date();
            toggleCardSelect();
            openModal('newLoanModal');
        };
    }

    if (dom.btnReport) {
        dom.btnReport.onclick = () => {
            populateDebtorSelect();
            updateReportPreview();
            openModal('reportModal');
        };
    }

    const btnManageCards = document.getElementById('btnManageCards');
    if (btnManageCards) {
        btnManageCards.onclick = () => {
            renderManageCards();
            openModal('manageCardsModal');
        }
    }

    const btnManageDebtors = document.getElementById('btnManageDebtors');
    if (btnManageDebtors) {
        btnManageDebtors.onclick = () => {
            renderManageDebtors();
            openModal('manageDebtorsModal');
        }
    }

    // Modal Overlay Close
    document.querySelectorAll('.modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === el) el.classList.add('hidden');
        });
    });
}

// --- Modal Helpers ---

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

window.openNewDebtorFromLoan = () => {
    closeModal('newLoanModal');
    openModal('newDebtorModal');
}


// --- Logic: Debtor ---

window.handleNewDebtor = function (e) {
    e.preventDefault();
    const name = document.getElementById('inpDebtorName').value;
    const phone = document.getElementById('inpDebtorPhone').value;
    const notes = document.getElementById('inpDebtorNotes').value;

    if (!name) return alert("Obrigatório nome.");

    const newDebtor = { id: Date.now(), name, phone, notes };
    dbDebtors.push(newDebtor);
    saveData();
    document.getElementById('newDebtorForm').reset();
    closeModal('newDebtorModal');
    populateDebtorSelect();
    updateUI();
}

function populateDebtorSelect() {
    const opts = dbDebtors.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    dom.inpLoanDebtor.innerHTML = `<option value="">Selecione...</option>` + opts;
    dom.inpReportDebtor.innerHTML = `<option value="">Selecione...</option>` + opts;

    const currentFilter = dom.filterDebtor.value;
    dom.filterDebtor.innerHTML = `<option value="all">Todos os Devedores</option>` + opts;
    if (currentFilter && currentFilter !== 'all') dom.filterDebtor.value = currentFilter;
}

window.renderManageDebtors = function () {
    const list = document.getElementById('debtorsList');
    list.innerHTML = '';
    dbDebtors.forEach(d => {
        const div = document.createElement('div');
        div.className = 'manage-item';
        div.innerHTML = `
            <div class="manage-info">
                <strong>${d.name}</strong>
                <span>${d.phone || '-'}</span>
            </div>
            <button class="icon-btn" onclick="deleteDebtor(${d.id})" title="Excluir">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        list.appendChild(div);
    });
}

window.deleteDebtor = function (id) {
    if (confirm("Excluir devedor e todos seus empréstimos?")) {
        dbDebtors = dbDebtors.filter(d => d.id !== id);
        // Também remove empréstimos desse devedor para nao ficar órfão
        dbLoans = dbLoans.filter(l => l.debtorId !== id);

        saveData();
        renderManageDebtors();
        populateDebtorSelect();
        updateUI();
    }
}


// --- Logic: Cards ---

window.handleNewCard = function (e) {
    e.preventDefault();
    const name = dom.inpCardName.value;
    const last4 = dom.inpCardLast4.value;
    const dueDay = parseInt(dom.inpCardDueDay.value);

    if (!name || !dueDay) return alert("Preencha nome e dia venc.");

    const newCard = { id: Date.now(), name, last4, dueDay };
    dbCards.push(newCard);
    saveData();
    document.getElementById('newCardForm').reset();
    renderManageCards();
    populateCardDueDayFilter();
    // Se adicionar cartao pode afetar datas se mudar loan logic, mas por enquanto ok.
}

window.renderManageCards = function () {
    const list = document.getElementById('cardsList');
    list.innerHTML = '';
    dbCards.forEach(c => {
        const div = document.createElement('div');
        div.className = 'manage-item';
        div.innerHTML = `
            <div class="manage-info">
                <strong>${c.name} ${c.last4 ? '(' + c.last4 + ')' : ''}</strong>
                <span>Dia Venc: ${c.dueDay}</span>
            </div>
            <button class="icon-btn" onclick="deleteCard(${c.id})" title="Excluir">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        list.appendChild(div);
    });
}

window.deleteCard = function (id) {
    if (confirm("Excluir cartão?")) {
        dbCards = dbCards.filter(c => c.id !== id);
        saveData();
        renderManageCards();
        populateCardDueDayFilter();
        updateUI();
    }
}

function populateCardSelect() {
    const opts = dbCards.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    dom.inpLoanCard.innerHTML = `<option value="">Selecione...</option>` + opts;
}

function populateCardDueDayFilter() {
    const days = [...new Set(dbCards.map(c => c.dueDay))].sort((a, b) => a - b);
    const opts = days.map(d => `<option value="${d}">Dia ${d}</option>`).join('');
    dom.filterCardDueDay.innerHTML = `<option value="all">Dia Venc. Cartão</option>` + opts;
}

function populateDueDateExactFilter() {
    let dates = new Set();
    dbLoans.forEach(l => {
        const start = new Date(l.startDate + "T00:00:00");
        for (let i = 0; i < l.installmentsCount; i++) {
            let d = new Date(start);
            d.setMonth(d.getMonth() + i);
            dates.add(d.toISOString().split('T')[0]);
        }
    });

    const sorted = [...dates].sort();
    const opts = sorted.map(iso => {
        const [y, m, d] = iso.split('-');
        return `<option value="${iso}">${d}/${m}/${y}</option>`;
    }).join('');

    const current = dom.filterDueDateExact ? dom.filterDueDateExact.value : 'all';
    if (dom.filterDueDateExact) {
        dom.filterDueDateExact.innerHTML = `<option value="all">Data Vencimento (Todas)</option>` + opts;
        if (current) dom.filterDueDateExact.value = current;
    }
}

window.toggleCardSelect = function () {
    const type = dom.inpLoanType.value;
    if (type === 'cartao') {
        dom.divLoanCard.classList.remove('hidden');
    } else {
        dom.divLoanCard.classList.add('hidden');
        dom.inpLoanCard.value = "";
    }
}

window.calcDueDate = function () {
    const type = dom.inpLoanType.value;
    const purchaseDateVal = dom.inpLoanPurchaseDate.value;
    if (type === 'cartao' && purchaseDateVal) {
        const cardId = dom.inpLoanCard.value;
        const card = dbCards.find(c => c.id == cardId);
        if (card) {
            const pDate = new Date(purchaseDateVal + "T00:00:00");
            const dueDay = card.dueDay;
            let targetDate = new Date(pDate.getFullYear(), pDate.getMonth(), dueDay);

            if (targetDate < pDate) {
                targetDate.setMonth(targetDate.getMonth() + 1);
            } else {
                const diffTime = Math.abs(targetDate - pDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 10) targetDate.setMonth(targetDate.getMonth() + 1);
            }
            dom.inpLoanDate.valueAsDate = targetDate;
        }
    }
}


// --- Logic: Loans ---

window.handleNewLoan = function (e) {
    e.preventDefault();
    const debtorId = dom.inpLoanDebtor.value;
    const type = dom.inpLoanType.value;
    const cardId = dom.inpLoanCard.value;
    const purchaseDate = dom.inpLoanPurchaseDate.value;
    const date = dom.inpLoanDate.value;
    const val = parseFloat(dom.inpLoanValue.value);
    const count = parseInt(dom.inpLoanInstallments.value);
    const desc = dom.inpLoanDesc.value;

    if (!debtorId || isNaN(val)) return alert("Preencha corretamente.");
    if (type === 'cartao' && !cardId) return alert("Selecione um cartão.");

    const newLoan = {
        id: Date.now(),
        debtorId: parseInt(debtorId),
        type,
        cardId: cardId ? parseInt(cardId) : null,
        purchaseDate,
        startDate: date,
        totalValue: val,
        installmentsCount: count,
        installments: generateInstallments(val, count, 0),
        desc
    };

    dbLoans.push(newLoan);
    saveData();
    dom.formNewLoan.reset();
    closeModal('newLoanModal');
    updateUI();
}

function generateInstallments(total, count, paidCount) {
    const val = total / count;
    const list = [];
    for (let i = 1; i <= count; i++) {
        list.push({
            number: i,
            value: val,
            paidValue: i <= paidCount ? val : 0,
            // Status will be derived on runtime or explicitly stored?
            // Let's store logic: if paidValue >= val -> Pago.
            status: i <= paidCount ? 'Pago' : 'Pendente'
        });
    }
    return list;
}


// --- Rendering Table ---

// --- Filter Logic ---

function getFilteredInstallments() {
    const term = dom.inputSearch.value.toLowerCase();
    const debtorFilter = dom.filterDebtor.value;
    const dueDayFilter = dom.filterCardDueDay.value;
    const typeFilter = dom.filterType.value;
    const statusFilter = dom.filterStatus.value; // Added
    const dateStart = dom.filterDateStart.value;
    const dateEnd = dom.filterDateEnd.value;

    const displayLoans = dbLoans.map(loan => {
        const debtor = dbDebtors.find(d => d.id === loan.debtorId);
        const dName = debtor ? debtor.name : "Removido";

        const card = dbCards.find(c => c.id === loan.cardId) || { name: "-", dueDay: "-" };

        return {
            ...loan,
            debtorName: dName,
            cardName: loan.type === 'cartao' ? card.name : '-',
            cardDueDay: loan.type === 'cartao' ? card.dueDay : null,
        };
    });

    const filteredLoans = displayLoans.filter(item => {
        const searchTarget = (
            item.debtorName + " " + (item.desc || "") + " " + item.cardName + " " + item.totalValue
        ).toLowerCase();

        const matchSearch = searchTarget.includes(term);
        const matchDebtor = debtorFilter === 'all' || item.debtorId == debtorFilter;
        const matchType = typeFilter === 'all' || item.type === typeFilter;
        const matchDueDay = dueDayFilter === 'all' || item.cardDueDay == dueDayFilter;

        // Note: Status filter is better applied at INSTALLMENT level for flat view, 
        // but if we filter here, we filter the whole loan. 
        // Let's NOT filter loans by status here, but installments later.

        // Date filter moved to Installment Level (dueDate)
        return matchSearch && matchDebtor && matchType && matchDueDay;
    });

    // Flatten
    let flatInstallments = [];
    filteredLoans.forEach(loan => {
        const start = new Date(loan.startDate + "T00:00:00");
        loan.installments.forEach(inst => {
            // Status Filter Check
            if (statusFilter !== 'all' && inst.status !== statusFilter) return;

            let dueDate = new Date(start);
            dueDate.setMonth(start.getMonth() + (inst.number - 1));

            // Filtro de Data Exata (Novo)
            const dateExact = dom.filterDueDateExact ? dom.filterDueDateExact.value : 'all';
            if (dateExact && dateExact !== 'all') {
                const isoDate = dueDate.toISOString().split('T')[0];
                if (isoDate !== dateExact) return;
            }

            // Date Filter (Range)
            let matchDate = true;
            if (dateStart) {
                const ds = new Date(dateStart + "T00:00:00");
                if (dueDate < ds) matchDate = false;
            }
            if (dateEnd) {
                const de = new Date(dateEnd + "T00:00:00");
                if (dueDate > de) matchDate = false;
            }
            if (!matchDate) return;

            // Derive status dynamically for display
            const pVal = inst.paidValue || 0;
            let currentStatus = 'Pendente';
            if (pVal >= inst.value - 0.01) currentStatus = 'Pago';
            else if (pVal > 0) currentStatus = 'Parcial';

            // Allow override if explicitly stored as Pago (legacy)
            if (inst.status === 'Pago' && pVal === 0) {
                // Should have been migrated, but safety check
                currentStatus = 'Pago';
            }

            flatInstallments.push({
                loanId: loan.id,
                debtorName: loan.debtorName,
                desc: loan.desc,
                cardName: loan.cardName,
                purchaseDate: loan.purchaseDate,

                // Installment specific
                number: inst.number,
                totalCount: loan.installmentsCount,
                value: inst.value,
                paidValue: pVal,
                status: currentStatus,
                dueDate: dueDate,

                originalLoan: loan
            });
        });
    });

    flatInstallments.sort((a, b) => a.dueDate - b.dueDate);
    return { filteredLoans, flatInstallments };
}

// --- Rendering Table ---

let currentSelection = new Set(); // Stores "loanId_installmentNumber"

function updateUI() {
    const { filteredLoans, flatInstallments } = getFilteredInstallments();

    updateKPIs(flatInstallments);
    renderTable(flatInstallments);
    updateBulkButton();
}

function updateKPIs(installments) {
    let totalEsperado = 0;
    let totalRecebido = 0;

    installments.forEach(item => {
        totalEsperado += item.value;
        totalRecebido += (item.paidValue || 0);
    });

    const totalPendente = totalEsperado - totalRecebido;

    // Atualiza Labels para refletir contexto (opcional, mas bom UX)
    // Se tiver filtro de data, "Total Emprestado" vira "Total no Período" visualmente?
    // Por enquanto mantemos o ID mas a logica é sobre o VIEW atual.

    dom.kpiEmprestado.textContent = formatMoney(totalEsperado);
    dom.kpiRecebido.textContent = formatMoney(totalRecebido);
    dom.kpiPendente.textContent = formatMoney(totalPendente);
}

function renderTable(list) {
    dom.body.innerHTML = '';
    if (list.length === 0) {
        dom.emptyState.classList.remove('hidden');
        return;
    }
    dom.emptyState.classList.add('hidden');

    list.forEach(item => {
        const dateStr = item.dueDate.toLocaleDateString('pt-BR');

        // Unique ID for selection: loanId + "_" + installmentNumber
        const uniqueId = `${item.loanId}_${item.number}`;
        const isChecked = currentSelection.has(uniqueId) ? 'checked' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <input type="checkbox" class="row-checkbox" ${isChecked} onchange="toggleSelection('${uniqueId}')">
            </td>
            <td><strong>${item.debtorName}</strong></td>
            <td><small>${item.desc || '-'}</small></td>
            <td>${item.cardName}</td>
            <td>${formatDate(item.purchaseDate)}</td>
            <td>${dateStr}</td>
            <td>${formatMoney(item.value)}</td>
            <td>${item.number}/${item.totalCount}</td>
            <td>
                <span class="status-badge ${getBadgeClass(item)}" style="cursor:pointer" onclick="togglePaymentFromTable('${item.loanId}', ${item.number})">
                    <div class="status-dot"></div>${getStatusLabel(item)}
                </span>
            </td>
            <td>
                <button class="action-btn" onclick="openDetails('${item.loanId}')" title="Detalhes do Empréstimo">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
                <button class="action-btn" onclick="deleteLoanDirect('${item.loanId}')" title="Excluir Empréstimo Inteiro" style="color:var(--neon-red); margin-left:4px;">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        dom.body.appendChild(tr);
    });
}

// --- Bulk Selection Logic ---

window.toggleSelection = function (uniqueId) {
    if (currentSelection.has(uniqueId)) {
        currentSelection.delete(uniqueId);
    } else {
        currentSelection.add(uniqueId);
    }
    updateBulkButton();
}

window.toggleSelectAll = function () {
    const isChecked = document.getElementById('checkAll').checked;
    const { flatInstallments } = getFilteredInstallments();

    if (isChecked) {
        flatInstallments.forEach(item => {
            currentSelection.add(`${item.loanId}_${item.number}`);
        });
    } else {
        currentSelection.clear();
    }
    updateUI(); // Re-render to clear checkboxes
}

function updateBulkButton() {
    const count = currentSelection.size;
    const btn = document.getElementById('btnBulkPay');
    // Guard against missing span after UI changes
    const countEl = document.getElementById('selectedCount');
    if (countEl) countEl.textContent = count;

    // Also update title for icon-only view
    if (btn) btn.title = `Baixar Selecionados (${count})`;

    // Check main checkbox state
    const allChecks = document.querySelectorAll('.row-checkbox');
    const checkedChecks = document.querySelectorAll('.row-checkbox:checked');
    const mainCheck = document.getElementById('checkAll');
    if (mainCheck) mainCheck.checked = allChecks.length > 0 && allChecks.length === checkedChecks.length;

    if (count > 0) {
        btn.classList.remove('hidden');
        btn.style.display = 'flex'; // Ensure flex
    } else {
        btn.classList.add('hidden');
        btn.style.display = 'none';
    }
}

window.markSelectedPaid = function () {
    if (!confirm(`Marcar ${currentSelection.size} itens como PAGO?`)) return;

    let changes = 0;
    currentSelection.forEach(uniqueId => {
        const [loanId, numStr] = uniqueId.split('_');
        const num = parseInt(numStr);
        const lid = parseInt(loanId); // Ensure numeric

        const loan = dbLoans.find(l => l.id === lid);
        if (loan) {
            const inst = loan.installments.find(i => i.number === num);
            if (inst) {
                // For bulk, assume full payment
                if (inst.status !== 'Pago') {
                    inst.paidValue = inst.value;
                    inst.status = 'Pago';
                    changes++;
                }
            }
        }
    });

    if (changes > 0) {
        saveData();
        currentSelection.clear();
        document.getElementById('checkAll').checked = false;
        updateUI();
        alert(`${changes} parcelas atualizadas!`);
    } else {
        alert("Nenhuma alteração necessária (itens já pagos).");
        currentSelection.clear();
        updateUI();
    }
}


// --- Details & Delete ---

let activeLoanId = null;
window.openDetails = function (id) {
    // Ensure numeric
    activeLoanId = typeof id === 'string' ? parseInt(id) : id;
    const loan = dbLoans.find(l => l.id === activeLoanId);
    if (!loan) return console.error("Loan not found:", activeLoanId);

    const debtor = dbDebtors.find(d => d.id === loan.debtorId) || { name: "Removido" };

    document.getElementById('modalTitle').textContent = `Detalhes - ${debtor.name}`;
    document.getElementById('modalTotal').textContent = formatMoney(loan.totalValue);

    let info = '';
    if (debtor.phone) info += `<div><strong>Tel:</strong> ${debtor.phone}</div>`;
    if (loan.desc) info += `<div><strong>Ref:</strong> ${loan.desc}</div>`;
    if (loan.startDate) info += `<div><strong>Data Pag:</strong> ${formatDate(loan.startDate)}</div>`;
    document.getElementById('detailNotesContainer').innerHTML = info;

    const pend = loan.installments.reduce((sum, i) => sum + (i.value - (i.paidValue || 0)), 0);
    document.getElementById('modalRestante').textContent = formatMoney(pend);

    const listEl = document.getElementById('modalInstallmentsList');
    listEl.innerHTML = '';
    loan.installments.forEach(inst => {
        const div = document.createElement('div');
        div.className = `installment-item ${inst.status === 'Pago' ? 'paid' : ''}`;
        div.onclick = () => togglePayment(loan.id, inst.number);
        const pVal = inst.paidValue || 0;
        const rest = inst.value - pVal;
        const labelStatus = rest <= 0.01 ? 'Pago' : (pVal > 0 ? 'Parcial' : 'Pendente');
        const stClass = rest <= 0.01 ? 'pago' : (pVal > 0 ? 'parcial' : 'pendente');

        div.innerHTML = `
            <div class="inst-info">Parcela #${inst.number}</div>
            
            <div style="flex:1; text-align:center;">
                 <div class="inst-value">${formatMoney(inst.value)}</div>
                 ${pVal > 0 && rest > 0.01 ? `<small style="color:orange; font-size:0.75rem;">Pago: ${formatMoney(pVal)}</small>` : ''}
            </div>

            <div class="inst-status ${stClass}">${labelStatus}</div>
        `;
        listEl.appendChild(div);
    });

    openModal('detailsModal');
}

// Called from Modal
// Logic: togglePayment (Modal)
function togglePayment(lid, num) {
    const loan = dbLoans.find(l => l.id == lid);
    if (!loan) return;
    const i = loan.installments.find(x => x.number === num);
    if (!i) return;

    // Ensure paidValue exists
    if (typeof i.paidValue === 'undefined') i.paidValue = (i.status === 'Pago' ? i.value : 0);

    const remaining = i.value - i.paidValue;
    const isPaid = remaining <= 0.01; // tolerance

    if (isPaid) {
        if (confirm("Marcar esta parcela como PENDENTE (estornar)?")) {
            i.paidValue = 0;
            i.status = 'Pendente';
            saveAndRefsh(lid);
        }
    } else {
        // Options: Pay Full or Partial
        // Simple approach: Prompt
        const choice = prompt(`Valor da Parcela: ${formatMoney(i.value)}\nJá Pago: ${formatMoney(i.paidValue)}\nRestante: ${formatMoney(remaining)}\n\nDigite o valor para ABATER (ou deixe vazio para QUITAR o restante):`, remaining.toFixed(2));

        if (choice === null) return; // Cancel

        let amountToPay = 0;
        if (choice.trim() === "") {
            amountToPay = remaining;
        } else {
            amountToPay = parseFloat(choice.replace(',', '.'));
        }

        if (isNaN(amountToPay) || amountToPay < 0) return alert("Valor inválido.");

        i.paidValue += amountToPay;

        // Update status for consistency
        if (i.paidValue >= i.value - 0.01) {
            i.paidValue = i.value; // Cap to max
            i.status = 'Pago';
        } else if (i.paidValue > 0) {
            i.status = 'Parcial';
        } else {
            i.status = 'Pendente';
        }

        saveAndRefsh(lid);
    }
}

function saveAndRefsh(lid) {
    saveData();
    if (lid) openDetails(lid);
    updateUI();
}

// Called from Table
// Logic: Toggle from Table (Direct click on badge)
window.togglePaymentFromTable = function (lid, num) {
    // Reuse logic, but handle no-refresh of modal part
    // Usually clicking badge in table is quick "Mark Paid".
    // Let's forward to main toggle logic but without reopening modal? 
    // Actually togglePayment handles logic. Let's make it work.

    // We need to know if we are in modal or not. The updated togglePayment tries to openDetails.
    // Let's create a specialized one or adapt. 
    // User expectation on table click: Quick switch? Or prompt too?
    // Let's stick to prompt for consistency.

    togglePayment(lid, num);
    // Note: this will open the modal details as side effect of saveAndRefsh calling openDetails.
    // Maybe desirable to see result.
}

// Helpers for Badge Display
function getBadgeClass(item) {
    // item here is the flat structure from getFilteredInstallments
    // We need to ensure we look at paidValue if available
    // But flatInstallments constructs derived properties. Let's check getFilteredInstallments

    // Actually, let's fix getFilteredInstallments to pass through paidValue first.
    // See separate chunk.

    // Assuming item has status 'Pago', 'Pendente', 'Parcial'
    if (item.status === 'Pago') return 'status-pago';
    if (item.status === 'Parcial') return 'status-parcial';
    return 'status-pendente';
}

function getStatusLabel(item) {
    if (item.status === 'Parcial') {
        // Calc remaining
        const rest = item.value - (item.paidValue || 0);
        return `Rest: ${formatMoney(rest)}`;
    }
    return item.status;
}

window.deleteCurrentLoan = function () {
    if (activeLoanId && confirm("Excluir empréstimo permanentemente?")) {
        dbLoans = dbLoans.filter(l => l.id !== activeLoanId);
        saveData();
        closeModal('detailsModal');
        updateUI();
    }
}

window.deleteLoanDirect = function (id) {
    if (confirm("Excluir este empréstimo e TODAS as suas parcelas?")) {
        const numericId = parseInt(id);
        dbLoans = dbLoans.filter(l => l.id !== numericId);
        saveData();
        updateUI();
    }
}


// --- Export ---

window.generateExcel = function () {
    const { flatInstallments } = getFilteredInstallments();
    let totalValue = 0;

    const data = flatInstallments.map(item => {
        totalValue += item.value;
        const status = item.status || 'Pendente';

        return {
            "Devedor": item.debtorName,
            "Descrição": item.desc || '',
            "Tipo": item.originalLoan.type,
            "Valor Parcela": item.value,
            "Cartão": item.cardName,
            "Data da Compra": item.purchaseDate ? formatDate(item.purchaseDate) : '',
            "Parcela": `${item.number}/${item.totalCount}`,
            "Vencimento": item.dueDate.toLocaleDateString('pt-BR'),
            "Status": status
        };
    });

    // Add Total Row
    data.push({
        "Devedor": "TOTAL",
        "Descrição": "",
        "Tipo": "",
        "Valor Parcela": totalValue,
        "Cartão": "",
        "Data da Compra": "",
        "Parcela": "",
        "Vencimento": "",
        "Status": ""
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parcelas_Filtradas");
    XLSX.writeFile(wb, "Relatorio_Parcelas.xlsx");
    closeModal('exportModal');
}

window.generatePDF = function () {
    const { jsPDF } = window.jspdf;
    const { flatInstallments } = getFilteredInstallments();
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better fit

    doc.setFontSize(18);
    doc.text("Relatório de Parcelas", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableColumn = ["Devedor", "Descrição", "Tipo", "Valor Parc.", "Cartão", "Compra", "Parc.", "Vencimento", "Status"];
    const tableRows = [];
    let totalValue = 0;

    flatInstallments.forEach(item => {
        totalValue += item.value;

        const row = [
            item.debtorName,
            item.desc || '',
            item.originalLoan.type,
            formatMoney(item.value),
            item.cardName,
            formatDate(item.purchaseDate),
            `${item.number}/${item.totalCount}`,
            item.dueDate.toLocaleDateString('pt-BR'),
            item.status
        ];
        tableRows.push(row);
    });

    // Total Row
    const totalRow = ["TOTAL", "", "", formatMoney(totalValue), "", "", "", "", ""];

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        foot: [totalRow],
    });

    doc.save("Relatorio_Parcelas.pdf");
    closeModal('exportModal');
}


// --- Billing / Cobrança Feature ---

function setupBillingListeners() {
    const btnBilling = document.getElementById('btnBilling');
    if (btnBilling) btnBilling.addEventListener('click', openBillingModal);
}

function openBillingModal() {
    const { flatInstallments } = getFilteredInstallments();

    // Filter only Pending/Pendente for billing by default? 
    // The user said "appears the table of what was filtered". 
    // So we respect the current view.

    // However, usually billing implies "Pending". 
    // If the user filtered by "All Status", showing "Paid" might be weird for "Cobrança".
    // But let's respect the "filtered" data as requested.

    const tbody = document.getElementById('billingTableBody');
    tbody.innerHTML = '';

    let total = 0;

    // Display all items (no limit)
    const displayList = flatInstallments;

    displayList.forEach(item => {
        total += item.value;
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #E0E5F2';
        tr.innerHTML = `
            <td style="padding:4px 8px; color:#2B3674;">${item.dueDate.toLocaleDateString('pt-BR')}</td>
            <td style="padding:4px 8px; color:#2B3674;">${item.number}/${item.totalCount} - ${item.debtorName} <br><small style="color:#787fa1;">${item.desc || ''}</small></td>
            <td style="padding:4px 8px; text-align:right; color:#2B3674; font-weight:600;">${formatMoney(item.value)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('billingTotal').textContent = formatMoney(total);
    document.getElementById('billingDate').textContent = `Gerado em ${new Date().toLocaleDateString('pt-BR')}`;

    openModal('billingModal');
}

window.downloadBillingImage = function () {
    const originalElement = document.getElementById('billingCaptureArea');

    // Clone to ensure full height capture (fix cut-off issues)
    const clone = originalElement.cloneNode(true);

    // Configure clone styles
    clone.style.width = originalElement.offsetWidth + 'px'; // Maintain width
    clone.style.height = 'auto'; // Allow full height
    clone.style.position = 'absolute';
    clone.style.top = '-9999px'; // Move off-screen
    clone.style.left = '0';
    clone.style.zIndex = '-1';
    clone.style.overflow = 'visible'; // Ensure no scrollbars

    document.body.appendChild(clone);

    html2canvas(clone, {
        backgroundColor: "#FFFFFF",
        scale: 2, // High resolution
        useCORS: true,
        logging: false
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Cobranca_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();

        // Cleanup
        document.body.removeChild(clone);
    }).catch(err => {
        console.error("Erro ao gerar imagem:", err);
        alert("Erro ao gerar imagem.");
        if (document.body.contains(clone)) document.body.removeChild(clone);
    });
}

window.shareBillingWhatsapp = function () {
    // 1. Download the image for the user
    downloadBillingImage();

    // 2. Prepare message
    // Try to find a phone number if only one debtor is filtered
    const { filteredLoans } = getFilteredInstallments();

    // Get unique debtor IDs involved
    const debtorIds = [...new Set(filteredLoans.map(l => l.debtorId))];
    let phone = "";

    if (debtorIds.length === 1) {
        const debtor = dbDebtors.find(d => d.id === debtorIds[0]);
        if (debtor && debtor.phone) phone = debtor.phone.replace(/\D/g, ''); // numbers only
    }

    const text = encodeURIComponent("Olá! Segue o resumo das pendências. (A imagem foi baixada no seu dispositivo, por favor anexe-a aqui).");

    // 3. Open WhatsApp
    let url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
}

// Call setup in setupListeners logic
// But since I cannot edit setupListeners easily without replacing huge block, 
// I will just add the listener if the element exists in updateUI or init, 
// OR simpler: just add onclick in HTML or add the listener line in next step.


// --- Relatórios WhatsApp ---

window.updateReportPreview = function () {
    const debtorId = dom.inpReportDebtor.value;
    const previewEl = document.getElementById('reportPreview');
    const btnSend = document.getElementById('btnSendReport');

    if (!debtorId) {
        previewEl.innerHTML = '<p style="text-align:center;">Selecione um devedor.</p>';
        btnSend.style.display = 'none';
        return;
    }

    const debtor = dbDebtors.find(d => d.id == debtorId);
    if (!debtor) return;
    const loans = dbLoans.filter(l => l.debtorId == debtorId);

    let lines = [];
    let totalDue = 0;

    loans.forEach(l => {
        l.installments.forEach(inst => {
            if (inst.status === 'Pendente') {
                lines.push(`- Parcela ${inst.number}/${l.installmentsCount} (${l.desc || 'Empréstimo'}): ${formatMoney(inst.value)}`);
                totalDue += inst.value;
            }
        });
    });

    if (lines.length === 0) {
        previewEl.innerHTML = '<p style="text-align:center;">Nada pendente!</p>';
        btnSend.style.display = 'none';
        return;
    }

    const now = new Date().toLocaleDateString('pt-BR');
    let text = `*COBRANÇA - ${now}*\nOlá ${debtor.name}, segue resumo:\n\n`;
    text += lines.join('\n');
    text += `\n\n*TOTAL A PAGAR: ${formatMoney(totalDue)}*`;

    previewEl.textContent = text;
    btnSend.style.display = 'flex';

    const cleanNum = (debtor.phone || "").replace(/\D/g, '');
    if (cleanNum) {
        btnSend.href = `https://wa.me/55${cleanNum}?text=${encodeURIComponent(text)}`;
    } else {
        btnSend.onclick = () => alert("Sem telefone cadastrado.");
    }
}

// Helpers
function formatMoney(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatDate(s) { if (!s) return '-'; const d = new Date(s + "T00:00:00"); return d.toLocaleDateString('pt-BR'); }

// Init
init();