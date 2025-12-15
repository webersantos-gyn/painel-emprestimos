import os

file_path = 'c:/Projetos IA/Painel_Emprestimos/app.js'

# Correct code block to append
new_code = """window.updateReportPreview = function () {
    const debtorId = dom.inpReportDebtor.value;
    const previewEl = document.getElementById('reportPreview');
    const btnSend = document.getElementById('btnSendReport');

    if (!debtorId) {
        previewEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary)">Selecione um devedor.</p>';
        btnSend.style.display = 'none';
        return;
    }

    const debtor = dbDebtors.find(d => d.id == debtorId);
    if(!debtor) return;
    
    // Find loans for this debtor
    const loans = dbLoans.filter(l => l.debtorId == debtorId);

    let lines = [];
    let totalDue = 0;

    loans.forEach(l => {
        l.installments.forEach(inst => {
            if (inst.status === 'Pendente' || inst.status === 'Parcial') {
                const rest = inst.value - (inst.paidValue || 0);
                lines.push(`- Parcela ${inst.number}/${l.installmentsCount} (${l.desc || 'Empréstimo'}): ${rest.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
                totalDue += rest;
            }
        });
    });

    if (lines.length === 0) {
        previewEl.innerHTML = '<p style="text-align:center;">Nada pendente para este devedor! 🎉</p>';
        btnSend.style.display = 'none';
        return;
    }

    const now = new Date().toLocaleDateString('pt-BR');
    let text = `*RELATÓRIO DE COBRANÇA*\\n`;
    text += `Olá ${debtor.name}, segue demonstrativo atualizado (${now}):\\n\\n`;
    text += lines.join('\\n');
    text += `\\n\\n*TOTAL A PAGAR: ${totalDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`;

    previewEl.textContent = text;
    btnSend.style.display = 'flex';

    const cleanNum = (debtor.phone || "").replace(/\\D/g, '');
    if (cleanNum) {
        btnSend.href = `https://wa.me/55${cleanNum}?text=${encodeURIComponent(text)}`;
    } else {
        btnSend.href = '#';
        btnSend.onclick = () => alert("Devedor sem telefone cadastrado.");
    }
}

// --- Backup & Restore Logic ---

window.downloadBackup = function() {
    const backupData = {
        loans: dbLoans,
        debtors: dbDebtors,
        cards: dbCards,
        backupDate: new Date().toISOString()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_painel_" + new Date().getTime() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

window.restoreBackup = function(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            
            if (!json.loans || !json.debtors) {
                return alert("Arquivo de backup inválido!");
            }
            
            if(confirm("ATENÇÃO: Isso irá SUBSTITUIR todos os dados atuais pelos do backup. Deseja continuar?")) {
                dbLoans = json.loans || [];
                dbDebtors = json.debtors || [];
                dbCards = json.cards || [];
                
                saveData();
                updateUI();
                alert("Backup restaurado com sucesso!");
                closeModal('exportModal');
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao ler arquivo de backup.");
        }
        input.value = '';
    };
    reader.readAsText(file);
}

// Ensure init is called
init();
"""

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the split point
split_marker = "window.updateReportPreview = function"
idx = content.find(split_marker)

if idx != -1:
    # Keep everything before
    clean_content = content[:idx]
    # Append new code
    full_content = clean_content + new_code
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(full_content)
    print("File fixed successfully.")
else:
    print("Could not find split marker.")
