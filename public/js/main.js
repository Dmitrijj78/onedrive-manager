document.addEventListener('DOMContentLoaded', function() {
    // DOM элементы
    const accountsContainer = document.getElementById('accounts-container');
    const filesContainer = document.getElementById('files-container');
    const addAccountBtn = document.getElementById('add-account-btn');
    const accountSection = document.getElementById('account-section');
    const fileSection = document.getElementById('file-section');

    // Загрузка аккаунтов при запуске
    loadAccounts();

    // Обработчик добавления аккаунта
    addAccountBtn.addEventListener('click', function() {
        const accountName = prompt('Введите имя аккаунта:');
        const accountEmail = prompt('Введите email аккаунта:');
        
        if (accountName && accountEmail) {
            addAccount(accountName, accountEmail);
        }
    });

    // Функция загрузки аккаунтов
    function loadAccounts() {
        fetch('/api/accounts')
            .then(response => response.json())
            .then(accounts => {
                renderAccounts(accounts);
            })
            .catch(error => {
                console.error('Ошибка загрузки аккаунтов:', error);
                accountsContainer.innerHTML = '<p class="error">Ошибка загрузки аккаунтов. Попробуйте позже.</p>';
            });
    }

    // Функция отображения аккаунтов
    function renderAccounts(accounts) {
        if (accounts.length === 0) {
            accountsContainer.innerHTML = '<p class="no-accounts">У вас пока нет подключенных аккаунтов</p>';
            return;
        }

        let html = '';
        accounts.forEach(account => {
            html += `
                <div class="account-card" data-id="${account.id}">
                    <div class="account-info">
                        <div class="account-name">${account.name}</div>
                        <div class="account-email">${account.email}</div>
                    </div>
                    <div class="account-actions">
                        <button class="btn primary view-btn" data-id="${account.id}">Просмотреть</button>
                        <button class="btn danger delete-btn" data-id="${account.id}">Удалить</button>
                    </div>
                </div>
            `;
        });

        accountsContainer.innerHTML = html;

        // Добавляем обработчики событий для кнопок
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const accountId = this.getAttribute('data-id');
                loadFiles(accountId);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const accountId = this.getAttribute('data-id');
                if (confirm('Вы уверены, что хотите удалить этот аккаунт?')) {
                    deleteAccount(accountId);
                }
            });
        });
    }

    // Функция добавления аккаунта
    function addAccount(name, email) {
        fetch('/api/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email })
        })
        .then(response => response.json())
        .then(() => {
            loadAccounts();
        })
        .catch(error => {
            console.error('Ошибка добавления аккаунта:', error);
            alert('Не удалось добавить аккаунт. Попробуйте позже.');
        });
    }

    // Функция удаления аккаунта
    function deleteAccount(id) {
        fetch(`/api/accounts/${id}`, {
            method: 'DELETE'
        })
        .then(() => {
            loadAccounts();
            // Если был открыт раздел файлов этого аккаунта, скрываем его
            if (fileSection.style.display !== 'none') {
                fileSection.style.display = 'none';
                accountSection.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Ошибка удаления аккаунта:', error);
            alert('Не удалось удалить аккаунт. Попробуйте позже.');
        });
    }

    // Функция загрузки файлов
    function loadFiles(accountId) {
        filesContainer.innerHTML = '<p class="loading">Загрузка файлов...</p>';
        fileSection.style.display = 'block';
        accountSection.style.display = 'none';
        
        fetch(`/api/accounts/${accountId}/files`)
            .then(response => response.json())
            .then(files => {
                renderFiles(files, accountId);
            })
            .catch(error => {
                console.error('Ошибка загрузки файлов:', error);
                filesContainer.innerHTML = '<p class="error">Ошибка загрузки файлов. Попробуйте позже.</p>';
            });
    }

    // Функция отображения файлов
    function renderFiles(files, accountId) {
        if (files.length === 0) {
            filesContainer.innerHTML = '<p class="no-files">В этом аккаунте пока нет файлов</p>';
            return;
        }

        let html = '<h3>Файлы:</h3>';
        files.forEach(file => {
            html += `
                <div class="file-item">
                    <div class="file-name">${file.name}</div>
                    <div class="file-actions">
                        <button class="btn primary" onclick="downloadFile('${accountId}', '${file.id}')">Скачать</button>
                        <button class="btn danger" onclick="deleteFile('${accountId}', '${file.id}')">Удалить</button>
                    </div>
                </div>
            `;
        });

        html += `<button class="btn" onclick="backToAccounts()">← Назад к аккаунтам</button>`;
        filesContainer.innerHTML = html;
    }

    // Функция возврата к списку аккаунтов
    window.backToAccounts = function() {
        fileSection.style.display = 'none';
        accountSection.style.display = 'block';
    }

    // Функция скачивания файла
    window.downloadFile = function(accountId, fileId) {
        window.location.href = `/api/accounts/${accountId}/files/${fileId}/download`;
    }

    // Функция удаления файла
    window.deleteFile = function(accountId, fileId) {
        if (confirm('Вы уверены, что хотите удалить этот файл?')) {
            fetch(`/api/accounts/${accountId}/files/${fileId}`, {
                method: 'DELETE'
            })
            .then(() => {
                loadFiles(accountId);
            })
            .catch(error => {
                console.error('Ошибка удаления файла:', error);
                alert('Не удалось удалить файл. Попробуйте позже.');
            });
        }
    }
});