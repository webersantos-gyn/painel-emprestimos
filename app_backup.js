/**
 * Painel de Empréstimos - JS Logic
 * v3.0 - Separação de Devedores/Empréstimos e Relatórios
 */

// --- Estrutura de Dados ---
/**
 * dbDebtors = [ { id, name, phone, notes } ]
 * dbLoans = [ { id, debtorId, type, totalValue, installmentsCount, installments: [], desc, startDate, purchaseDate, cardId } ]
 * dbCards = [ { id, name, last4, dueDay } ]
 */

let dbDebtors = [];
let dbLoans = [];
let dbCards = [];

// --- Inicialização ---

function init() {
    loadData();
    populateDebtorSelect();
    populateCardDueDayFilter();
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
        // Tentar migrar da v2?
        const oldData = localStorage.getItem('painel_emprestimos_db');
        if (oldData) {
            migrateData(JSON.parse(oldData));
        } else {
            // Mock inicial se vazio total
            if (dbDebtors.length === 0) {
                const newDebtor = { id: Date.now(), name: "João Mock", phone: "11999999999", notes: "Exemplo" };
                dbDebtors.push(newDebtor);
                dbLoans.push({
                    id: Date.now() + 1,
                    debtorId: newDebtor.id,
                    type: "dinheiro",
                    totalValue: 500.00,
                    installmentsCount: 2,
                    installments: generateInstallments(500, 2, 0),
                    startDate: new Date().toISOString().split('T')[0],
                    desc: "Teste Inicial"
                });
                saveData();
            }
        }
    }
}

function migrateData(oldList) {
    // Converte lista antiga (tudo misturado) para modelo relacional
    oldList.forEach(item => {
        // Cria devedor baseado no item antigo
        const debtorId = item.id; // Usa o mesmo ID para facilitar
        const debtor = {
            id: debtorId,
            name: item.creditor || "Desconhecido",
            phone: item.phone || "",
            notes: item.notes || ""
        };
        dbDebtors.push(debtor);

        // Cria empréstimo linkado
        const loan = {
            id: item.id + "_loan",
            debtorId: debtorId,
            type: item.type,
            totalValue: item.totalValue,
            installmentsCount: item.installmentsCount,
            installments: item.installments,
            startDate: item.startDate,
            desc: item.notes || "" // Repete nota no emprestimo
        };
        dbLoans.push(loan);
    });
    saveData();
    // Limpa v2 para evitar dupla migração futura? Melhor nao, deixa backup.
}

function saveData() {
    localStorage.setItem('painel_devedores_db', JSON.stringify(dbDebtors));
    localStorage.setItem('painel_emprestimos_v3_db', JSON.stringify(dbLoans));
    localStorage.setItem('painel_cartoes_db', JSON.stringify(dbCards));
    updateUI();
}

// --- Listeners & Modais ---

const dom = {
    // Body & Filter
    body: document.getElementById('loansTableBody'),
    inputSearch: document.getElementById('filterSearch'),
    filterDebtor: document.getElementById('filterDebtor'),
    filterCardDueDay: document.getElementById('filterCardDueDay'),
    filterType: document.getElementById('filterType'),
    filterDateStart: document.getElementById('filterDateStart'),
    filterDateEnd: document.getElementById('filterDateEnd'),
    emptyState: document.getElementById('emptyState'),

    // KPIs
    kpiEmprestado: document.getElementById('kpiTotalEmprestado'),
    kpiRecebido: document.getElementById('kpiTotalRecebido'),
    kpiPendente: document.getElementById('kpiTotalPendente'),

    // Modais
    btnNewDebtor: document.getElementById('btnNewDebtor'),
    btnNewLoan: document.getElementById('btnNewLoan'),
    btnReport: document.getElementById('btnReport'),

    modalNewDebtor: document.getElementById('newDebtorModal'),
    modalNewLoan: document.getElementById('newLoanModal'),
    modalReport: document.getElementById('reportModal'),
    modalDetails: document.getElementById('detailsModal'),

    // Forms
    formNewDebtor: document.getElementById('newDebtorForm'),
    formNewLoan: document.getElementById('newLoanForm'),

    // Inputs Loan
    inpLoanDebtor: document.getElementById('inpLoanDebtor'),
    inpLoanType: document.getElementById('inpLoanType'),
    inpLoanDate: document.getElementById('inpLoanDate'),
    inpLoanValue: document.getElementById('inpLoanValue'),
    inpLoanInstallments: document.getElementById('inpLoanInstallments'),
    inpLoanDesc: document.getElementById('inpLoanDesc'),

    // Inputs Report
    inpReportDebtor: document.getElementById('inpReportDebtor'),
    inpReportDate: document.getElementById('inpReportDate'),
    reportPreview: document.getElementById('reportPreview'),
    btnSendReport: document.getElementById('btnSendReport'),

    // Cards
    inpLoanPurchaseDate: document.getElementById('inpLoanPurchaseDate'),
    divLoanCard: document.getElementById('divLoanCard'),
    inpLoanCard: document.getElementById('inpLoanCard'),
    inpCardName: document.getElementById('inpCardName'),
    inpCardLast4: document.getElementById('inpCardLast4'),
    inpCardDueDay: document.getElementById('inpCardDueDay'),
};

function setupListeners() {
    dom.inputSearch.addEventListener('input', updateUI);
    dom.filterDebtor.addEventListener('change', updateUI);
    dom.filterCardDueDay.addEventListener('change', updateUI);
    dom.filterType.addEventListener('change', updateUI);
    dom.filterDateStart.addEventListener('change', updateUI);
    dom.filterDateEnd.addEventListener('change', updateUI);
    document.getElementById('btnExport').addEventListener('click', () => openModal('exportModal'));

    // Abrir Modais
    dom.btnNewDebtor.onclick = () => openModal('newDebtorModal');
    dom.btnNewLoan.onclick = () => {
        populateDebtorSelect();
        populateCardSelect(); // Populate cards before showing
        dom.inpLoanDate.valueAsDate = new Date();
        dom.inpLoanPurchaseDate.valueAsDate = new Date();
        toggleCardSelect(); // Ensure correct field visibility
        openModal('newLoanModal');
    };
    dom.btnReport.onclick = () => {
        populateDebtorSelect();
        updateReportPreview(); // Limpa
        openModal('reportModal');
    };

    // Manage Buttons
    document.getElementById('btnManageCards').onclick = () => {
        renderManageCards();
        openModal('manageCardsModal');
    }
    document.getElementById('btnManageDebtors').onclick = () => {
        renderManageDebtors();
        openModal('manageDebtorsModal');
    }

    // Fechar Modais (Backdrop)
    document.querySelectorAll('.modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === el) el.classList.add('hidden');
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
}

window.openNewDebtorFromLoan = () => {
    closeModal('newLoanModal');
    openModal('newDebtorModal');
}


// --- Lógica de Negócios: Devedores ---

window.handleNewDebtor = function (e) {
    e.preventDefault();
    const name = document.getElementById('inpDebtorName').value;
    const phone = document.getElementById('inpDebtorPhone').value;
    const notes = document.getElementById('inpDebtorNotes').value;

    if (!name) return alert("Obrigatório nome.");

    const newDebtor = {
        id: Date.now(),
        name,
        phone,
        notes
    };
    dbDebtors.push(newDebtor);
    saveData();

    document.getElementById('newDebtorForm').reset();
    closeModal('newDebtorModal');
    alert("Devedor cadastrado com sucesso!");
}

function populateDebtorSelect() {
    const opts = dbDebtors.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    dom.inpLoanDebtor.innerHTML = `<option value="">Selecione...</option>` + opts;
    dom.inpReportDebtor.innerHTML = `<option value="">Selecione...</option>` + opts;

    // Preserve selected value if possible, or default to all
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <polyline points="3 6 5 6 21 6"></polyline>
                   <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;
        list.appendChild(div);
    });
}

window.deleteDebtor = function (id) {
    if (confirm("Tem certeza que deseja excluir este devedor?")) {
        dbDebtors = dbDebtors.filter(d => d.id !== id);
        saveData();
        renderManageDebtors();
        populateDebtorSelect(); // Update filter
        updateUI(); // Update main table to show names as removed
    }
}


// --- Lógica de Negócios: Cartões ---

window.handleNewCard = function (e) {
    e.preventDefault();
    const name = dom.inpCardName.value;
    const last4 = dom.inpCardLast4.value;
    const dueDay = parseInt(dom.inpCardDueDay.value);

    if (!name || !dueDay) return alert("Preencha nome e dia de vencimento.");

    const newCard = {
        id: Date.now(),
        name,
        last4,
        dueDay
    };
    dbCards.push(newCard);
    saveData();
    document.getElementById('newCardForm').reset();
    renderManageCards();
    populateCardDueDayFilter();
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
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <polyline points="3 6 5 6 21 6"></polyline>
                   <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
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
        populateCardFilter(); // Update filter
    }
}

function populateCardSelect() {
    const opts = dbCards.map(c => `<option value="${c.id}">${c.name} (Venc: ${c.dueDay})</option>`).join('');
    dom.inpLoanCard.innerHTML = `<option value="">Selecione...</option>` + opts;
}

function populateCardDueDayFilter() {
    // Extract unique due days
    const days = [...new Set(dbCards.map(c => c.dueDay))].sort((a, b) => a - b);
    const opts = days.map(d => `<option value="${d}">Dia ${d}</option>`).join('');
    dom.filterCardDueDay.innerHTML = `<option value="all">Dia Venc. Cartão</option>` + opts;
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

            // Logic: If purchase day is before closing date (approx 10 days before due), it falls in same month (if due date hasn't passed) or next.
            // Simplified Rule as per common Brazilian cards: 
            // Closing date is usually ~7-10 days before due date.
            // Let's assume closing is 10 days before Due Date.

            // We need to find the next occurrence of Due Day that is at least X days after Purchase.
            // If we assume "Best Buy Date" is closing date.

            let targetDate = new Date(pDate.getFullYear(), pDate.getMonth(), dueDay);

            // If target date is before purchase date, definitely next month
            if (targetDate < pDate) {
                targetDate.setMonth(targetDate.getMonth() + 1);
            } else {
                // Check gap. If gap < 10 days, move to next month?
                // Example: Buy on 5th. Due Day 10th. diff = 5 days. Usually falls on NEXT month (10th).
                // Example: Buy on 25th. Due Day 10th (of next month). 

                const diffTime = Math.abs(targetDate - pDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 10) {
                    targetDate.setMonth(targetDate.getMonth() + 1);
                }
            }

            dom.inpLoanDate.valueAsDate = targetDate;
        }
    }
}


// --- Lógica de Negócios: Empréstimos ---

window.handleNewLoan = function (e) {
    e.preventDefault();
    const debtorId = dom.inpLoanDebtor.value;
    const type = dom.inpLoanType.value;
    const cardId = dom.inpLoanCard.value;
    const purchaseDate = dom.inpLoanPurchaseDate.value;
    const date = dom.inpLoanDate.value; // calculated or manual
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
}

function generateInstallments(total, count, paidCount) {
    const val = total / count;
    const list = [];
    for (let i = 1; i <= count; i++) {
        list.push({ number: i, value: val, status: i <= paidCount ? 'Pago' : 'Pendente' });
    }
    return list;
}


// --- Renderização Principal (Tabela) ---

function updateUI() {

    // Merge Loan + Debtor Info for display
    const term = dom.inputSearch.value.toLowerCase();
    const debtorFilter = dom.filterDebtor.value;
    const dueDayFilter = dom.filterCardDueDay.value;
    const type = dom.filterType.value;
    const dateStart = dom.filterDateStart.value;
    const dateEnd = dom.filterDateEnd.value;

    // Join Tables
    const displayData = dbLoans.map(loan => {
        const debtor = dbDebtors.find(d => d.id === loan.debtorId) || { name: "Removido", phone: "" };
        const card = dbCards.find(c => c.id === loan.cardId) || { name: "-", dueDay: "-" };

        // Status Check
        const status = loan.installments.every(i => i.status === 'Pago') ? 'Pago' : 'Pendente';

        return {
            ...loan,
            debtorName: debtor.name,
            debtorPhone: debtor.phone,
            cardName: loan.type === 'cartao' ? card.name : '-',
            cardDueDay: loan.type === 'cartao' ? card.dueDay : null,
            statusComputed: status
        };
    });

    const filtered = displayData.filter(item => {
        // Global Search
        const searchTarget = (
            item.debtorName +
            " " + (item.desc || "") +
            " " + item.cardName +
            " " + item.totalValue
        ).toLowerCase();

        const matchSearch = searchTarget.includes(term);
        const matchDebtor = debtorFilter === 'all' || item.debtorId == debtorFilter;
        const matchType = type === 'all' || item.type === type;
        const matchDueDay = dueDayFilter === 'all' || item.cardDueDay == dueDayFilter;

        // Date Range (Purchase Date)
        let matchDate = true;
        if (item.purchaseDate) {
            if (dateStart && item.purchaseDate < dateStart) matchDate = false;
            if (dateEnd && item.purchaseDate > dateEnd) matchDate = false;
        } else {
            // If no purchase date set (legacy logic), hide specific date filters? 
            // Or assume match if filtering dates? Let's hide if dates are active.
            if (dateStart || dateEnd) matchDate = false;
        }

        return matchSearch && matchDebtor && matchType && matchDueDay && matchDate;
    });

    updateKPIs(dbLoans);
    renderTable(filtered);
}

function updateKPIs(loans) {
    let emp = 0, rec = 0, pen = 0;
    loans.forEach(l => {
        emp += l.totalValue;
        l.installments.forEach(i => {
            if (i.status === 'Pago') rec += i.value;
            else pen += i.value;
        });
    });
    dom.kpiEmprestado.textContent = formatMoney(emp);
    dom.kpiRecebido.textContent = formatMoney(rec);
    dom.kpiPendente.textContent = formatMoney(pen);
}

function renderTable(list) {
    dom.body.innerHTML = '';
    if (list.length === 0) {
        dom.emptyState.classList.remove('hidden');
        return;
    }
    dom.emptyState.classList.add('hidden');

    const sorted = [...list].reverse(); // Recentes primeiro

    sorted.forEach(item => {
        const paidCount = item.installments.filter(i => i.status === 'Pago').length;
        const progress = Math.round((paidCount / item.installmentsCount) * 100);
        const stClass = item.statusComputed === 'Pago' ? 'status-pago' : 'status-pendente';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.debtorName}</strong></td>
            <td><small>${item.desc || '-'}</small></td>
            <td>${item.cardName}</td>
            <td>${formatDate(item.purchaseDate)}</td>
            <td>${formatDate(item.startDate)}</td>
            <td>${formatMoney(item.totalValue)}</td>
            <td>${paidCount}/${item.installmentsCount}</td>
            <td><span class="status-badge ${stClass}"><div class="status-dot"></div>${item.statusComputed}</span></td>
            <td>
                <button class="action-btn" onclick="openDetails(${item.id})" title="Detalhes">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
                <button class="action-btn" onclick="deleteLoanDirect(${item.id})" title="Excluir Lançamento" style="color:var(--neon-red); margin-left:4px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        dom.body.appendChild(tr);
    });
}

// --- Detalhes & Pagamento ---
let activeLoanId = null;

window.openDetails = function (id) {
    activeLoanId = id;
    const loan = dbLoans.find(l => l.id === id);
    if (!loan) return;
    const debtor = dbDebtors.find(d => d.id === loan.debtorId) || {};

    document.getElementById('modalTitle').textContent = `Detalhes - ${debtor.name}`;
    document.getElementById('modalTotal').textContent = formatMoney(loan.totalValue);

    // Notes
    let info = '';
    if (debtor.phone) info += `<div><strong>Tel:</strong> ${debtor.phone}</div>`;
    if (loan.desc) info += `<div><strong>Ref:</strong> ${loan.desc}</div>`;
    if (loan.startDate) info += `<div><strong>Data Pag:</strong> ${formatDate(loan.startDate)}</div>`;

    document.getElementById('detailNotesContainer').innerHTML = info;

    // Remaining
    const pend = loan.installments.filter(i => i.status === 'Pendente').reduce((a, b) => a + b.value, 0);
    document.getElementById('modalRestante').textContent = formatMoney(pend);

    // List
    const listEl = document.getElementById('modalInstallmentsList');
    listEl.innerHTML = '';
    loan.installments.forEach(inst => {
        const div = document.createElement('div');
        div.className = `installment-item ${inst.status === 'Pago' ? 'paid' : ''}`;
        div.onclick = () => togglePayment(loan.id, inst.number);
        div.innerHTML = `
            <div class="inst-info">Parcela #${inst.number}</div>
            <div class="inst-value">${formatMoney(inst.value)}</div>
            <div class="inst-status ${inst.status === 'Pago' ? 'pago' : 'pendente'}">${inst.status}</div>
        `;
        listEl.appendChild(div);
    });

    document.getElementById('detailsModal').classList.remove('hidden');
}

function togglePayment(lid, num) {
    const loan = dbLoans.find(l => l.id === lid);
    if (loan) {
        const i = loan.installments.find(x => x.number === num);
        if (i) {
            i.status = i.status === 'Pago' ? 'Pendente' : 'Pago';
            saveData();
            openDetails(lid); // Refresh modal
        }
    }
}

window.deleteCurrentLoan = function () {
    if (activeLoanId && confirm("Excluir empréstimo permanentemente?")) {
        dbLoans = dbLoans.filter(l => l.id !== activeLoanId);
        saveData();
        closeModal('detailsModal');
    }
}

window.deleteLoanDirect = function (id) {
    if (confirm("Excluir este lançamento de empréstimo?")) {
        dbLoans = dbLoans.filter(l => l.id !== id);
        saveData();
    }
}


// --- Relatórios ---

window.updateReportPreview = function () {
    const debtorId = dom.inpReportDebtor.value;
    const dateStr = dom.inpReportDate.value; // YYYY-MM
    const previewEl = dom.reportPreview;
    const btnSend = dom.btnSendReport;

    if (!debtorId) {
        previewEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary)">Selecione um devedor.</p>';
        btnSend.style.display = 'none';
        return;
    }

    const debtor = dbDebtors.find(d => d.id == debtorId);
    const loans = dbLoans.filter(l => l.debtorId == debtorId);

    // Filtrar parcelas
    let lines = [];
    let totalDue = 0;

    loans.forEach(l => {
        l.installments.forEach(inst => {
            if (inst.status === 'Pendente') {
                // Se tiver filtro de data, verificar (assumindo logica simples: data do emprestimo + mes da parcela)
                // Como não calculamos datas exatas, vamos listar TUDO que é pendente se não tiver data,
                // ou apenas tentar filtrar se o usuario selecionou data (o que é dificil sem logica de data real).
                // Simplificação: Mostrar TUDO pendente, pois usuario quer saber "quanto deve".
                lines.push(`- Parcela ${inst.number}/${l.installmentsCount} (${l.desc || 'Empréstimo'}): ${formatMoney(inst.value)}`);
                totalDue += inst.value;
            }
        });
    });

    if (lines.length === 0) {
        previewEl.innerHTML = '<p style="text-align:center;">Nada pendente para este devedor! 🎉</p>';
        btnSend.style.display = 'none';
        return;
    }

    // Montar texto
    const now = new Date().toLocaleDateString('pt-BR');
    let text = `*RELATÓRIO DE COBRANÇA*\n`;
    text += `Olá ${debtor.name}, segue demonstrativo atualizado (${now}):\n\n`;
    text += lines.join('\n');
    text += `\n\n*TOTAL A PAGAR: ${formatMoney(totalDue)}*`;

    previewEl.textContent = text;
    btnSend.style.display = 'flex';

    // Link
    const cleanNum = (debtor.phone || "").replace(/\D/g, '');
    if (cleanNum) {
        btnSend.href = `https://wa.me/55${cleanNum}?text=${encodeURIComponent(text)}`;
    } else {
        btnSend.href = '#';
        btnSend.onclick = () => alert("Devedor sem telefone cadastrado.");
    }
}


// --- Helpers ---
function formatMoney(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatDate(s) { if (!s) return '-'; const d = new Date(s + "T00:00:00"); return d.toLocaleDateString('pt-BR'); }


// --- Export ---
window.generateExcel = function () {
    const data = dbLoans.map(l => {
        const d = dbDebtors.find(x => x.id === l.debtorId) || { name: '-', phone: '' };
        const card = dbCards.find(c => c.id === l.cardId) || { name: '' };
        const paid = l.installments.filter(i => i.status === 'Pago').reduce((a, b) => a + b.value, 0);
        const status = l.installments.every(i => i.status === 'Pago') ? 'Pago' : 'Pendente';
        return {
            "Devedor": d.name,
            "Descrição": l.desc || '',
            "Tipo": l.type,
            "Cartão": card.name,
            "Data da Compra": l.purchaseDate || '',
            "Parcelas": l.installmentsCount,
            "Vencimento": l.startDate || '',
            "Status": status
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empréstimos");
    XLSX.writeFile(wb, "Relatorio_Emprestimos.xlsx");
    closeModal('exportModal');
}

window.generatePDF = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Relatório de Empréstimos", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableColumn = ["Devedor", "Descrição", "Tipo", "Cartão", "Compra", "Parcelas", "Vencimento", "Status"];
    const tableRows = [];

    dbLoans.forEach(l => {
        const d = dbDebtors.find(x => x.id === l.debtorId) || { name: '-', phone: '' };
        const card = dbCards.find(c => c.id === l.cardId) || { name: '' };
        const status = l.installments.every(i => i.status === 'Pago') ? 'Pago' : 'Pendente';

        const row = [
            d.name,
            l.desc || '',
            l.type,
            card.name,
            formatDate(l.purchaseDate),
            l.installmentsCount,
            formatDate(l.startDate),
            status
        ];
        tableRows.push(row);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [58, 169, 255] }
    });

    doc.save("Relatorio_Emprestimos.pdf");
    closeModal('exportModal');
}



init();