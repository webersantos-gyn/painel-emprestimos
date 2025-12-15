
// --- Backup & Restore Logic ---

window.downloadBackup = function () {
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
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

window.restoreBackup = function (input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);

            // Basic Validation
            if (!json.loans || !json.debtors) {
                return alert("Arquivo de backup inválido!");
            }

            if (confirm("ATENÇÃO: Isso irá SUBSTITUIR todos os dados atuais pelos do backup. Deseja continuar?")) {
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
        // Clear input so same file can be selected again if needed
        input.value = '';
    };
    reader.readAsText(file);
}
