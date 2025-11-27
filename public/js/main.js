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
                        <button class="btn cloud-btn" data-id="${account.id}">Облако OneDrive</button>
                        <button class="btn secondary view-btn" data-id="${account.id}">Просмотреть</button>
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

        // Добавляем обработчики для кнопок входа в OneDrive
        document.querySelectorAll('.cloud-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const accountId = this.getAttribute('data-id');
                openOneDriveModal(accountId);
            });
        });

        // Проверяем параметры URL для отображения сообщений об успешной/неудачной аутентификации
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auth_success')) {
            const accountId = urlParams.get('account_id');
            showNotification('✅ Аутентификация в OneDrive прошла успешно!', 'success');
        }
        
        if (urlParams.get('auth_error')) {
            showNotification('❌ Ошибка аутентификации в OneDrive. Попробуйте еще раз.', 'error');
        }
        
        // Очищаем параметры URL
        if (urlParams.get('auth_success') || urlParams.get('auth_error')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
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
            showNotification('❌ Не удалось добавить аккаунт. Попробуйте позже.', 'error');
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
            showNotification('✅ Аккаунт успешно удален', 'success');
        })
        .catch(error => {
            console.error('Ошибка удаления аккаунта:', error);
            showNotification('❌ Не удалось удалить аккаунт. Попробуйте позже.', 'error');
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
        showNotification('ℹ️ Файл готовится к скачиванию...', 'info');
        // В реальном приложении здесь будет логика скачивания
        setTimeout(() => {
            showNotification('✅ Файл успешно скачан', 'success');
        }, 1000);
    }

    // Функция удаления файла
    window.deleteFile = function(accountId, fileId) {
        if (confirm('Вы уверены, что хотите удалить этот файл?')) {
            fetch(`/api/accounts/${accountId}/files/${fileId}`, {
                method: 'DELETE'
            })
            .then(() => {
                loadFiles(accountId);
                showNotification('✅ Файл успешно удален', 'success');
            })
            .catch(error => {
                console.error('Ошибка удаления файла:', error);
                showNotification('❌ Не удалось удалить файл. Попробуйте позже.', 'error');
            });
        }
    }

    // Функция открытия модального окна OneDrive
    function openOneDriveModal(accountId) {
        // Создаем модальное окно, если его еще нет
        if (!document.getElementById('onedrive-modal')) {
            const modalHTML = `
                <div id="onedrive-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>OneDrive облако</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="cloud-content">
                                <p class="loading-spinner"></p>
                                <p style="text-align: center; margin-top: 10px;">Подключение к OneDrive...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Добавляем обработчик закрытия модального окна
            document.querySelector('.modal-close').addEventListener('click', closeOneDriveModal);
            document.getElementById('onedrive-modal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('onedrive-modal')) {
                    closeOneDriveModal();
                }
            });
        }
        
        // Отображаем модальное окно
        document.getElementById('onedrive-modal').style.display = 'flex';
        
        // Загружаем содержимое облака
        loadCloudContent(accountId);
    }

    // Функция закрытия модального окна
    function closeOneDriveModal() {
        document.getElementById('onedrive-modal').style.display = 'none';
    }

    // Функция загрузки содержимого облака
    function loadCloudContent(accountId) {
        const cloudContent = document.getElementById('cloud-content');
        
        // Сначала проверяем, авторизован ли аккаунт
        fetch(`/api/accounts/${accountId}/onedrive/files`)
            .then(response => {
                if (response.status === 401) {
                    // Аккаунт не авторизован, показываем кнопку для входа
                    return response.json().then(data => {
                        cloudContent.innerHTML = `
                            <p style="margin-bottom: 20px;">${data.error || 'Аккаунт не подключен к OneDrive'}</p>
                            <button id="connect-onedrive-btn" class="cloud-login-btn">
                                <span>Войти в OneDrive</span>
                            </button>
                        `;
                        document.getElementById('connect-onedrive-btn').addEventListener('click', () => {
                            initiateOneDriveAuth(accountId);
                        });
                    });
                }
                return response.json();
            })
            .then(files => {
                if (files && files.error) {
                    // Обработка других ошибок
                    cloudContent.innerHTML = `<p class="error">${files.error}</p>`;
                } else {
                    // Успешная загрузка файлов
                    renderCloudFiles(files, accountId);
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки содержимого OneDrive:', error);
                cloudContent.innerHTML = `<p class="error">Ошибка загрузки файлов: ${error.message}</p>`;
            });
    }

    // Функция инициации аутентификации OneDrive
    function initiateOneDriveAuth(accountId) {
        fetch(`/api/accounts/${accountId}/onedrive/auth`)
            .then(response => response.json())
            .then(data => {
                if (data.authUrl) {
                    window.location.href = data.authUrl;
                } else {
                    showNotification('❌ Ошибка получения URL аутентификации', 'error');
                }
            })
            .catch(error => {
                console.error('Ошибка аутентификации OneDrive:', error);
                showNotification('❌ Ошибка подключения к OneDrive', 'error');
            });
    }

    // Функция отображения файлов OneDrive
    function renderCloudFiles(files, accountId) {
        const cloudContent = document.getElementById('cloud-content');
        
        if (files.length === 0) {
            cloudContent.innerHTML = `
                <p>В вашем OneDrive пока нет файлов.</p>
                <div style="margin-top: 15px; text-align: right;">
                    <button class="btn secondary" onclick="loadCloudContent(${accountId})">Обновить</button>
                    <button class="btn" onclick="closeOneDriveModal()">Закрыть</button>
                </div>
            `;
            return;
        }
        
        let filesHTML = `
            <h3>Файлы и папки:</h3>
            <div class="files-list">
        `;
        
        files.forEach(file => {
            const folderIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#ffb300"><path d="M20 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H4V8h16v8z"/></svg>`;
            const fileIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#0074dd"><path d="M13 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9l-5-5zm-1 10H9v1h3v2H9v1h3v2H9v1h3v1H8V8h6v4z"/></svg>`;
            
            filesHTML += `
                <div class="file-row">
                    <span>
                        ${file.isFolder ? folderIcon : fileIcon}
                        <span class="file-name">${file.name}</span>
                    </span>
                    <span>${file.size || ''}</span>
                </div>
            `;
        });
        
        filesHTML += `
            </div>
            <div style="margin-top: 15px; text-align: right;">
                <button class="btn secondary" onclick="loadCloudContent(${accountId})">Обновить</button>
                <button class="btn" onclick="closeOneDriveModal()">Закрыть</button>
            </div>
        `;
        
        cloudContent.innerHTML = filesHTML;
    }

    // Функция отображения уведомлений
    function showNotification(message, type = 'info') {
        // Проверяем, существует ли уже контейнер для уведомлений
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 300px;
            `;
            document.body.appendChild(notificationContainer);
        }
        
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        notification.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            animation: slideIn 0.3s, fadeOut 0.5s 3s;
        `;
        
        notificationContainer.appendChild(notification);
        
        // Удаляем уведомление после анимации
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s';
            setTimeout(() => {
                if (notificationContainer.contains(notification)) {
                    notificationContainer.removeChild(notification);
                }
                if (notificationContainer.children.length === 0) {
                    document.body.removeChild(notificationContainer);
                }
            }, 500);
        }, 3000);
    }
});