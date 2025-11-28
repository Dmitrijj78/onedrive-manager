require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Мидлвары
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Массив для хранения аккаунтов (в реальном приложении это будет база данных)
let accounts = [
    { id: 1, name: 'Личный аккаунт', email: 'personal@example.com' },
    { id: 2, name: 'Рабочий аккаунт', email: 'work@example.com' }
];

// Хранилище для токенов аутентификации (в реальном приложении используйте базу данных)
const accountTokens = {};

// OneDrive API конфигурация
const ONE_DRIVE_CONFIG = {
    clientId: process.env.ONEDRIVE_CLIENT_ID,
    clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
    redirectUri: process.env.ONEDRIVE_REDIRECT_URI,
    scopes: ['Files.Read', 'Files.ReadWrite', 'Sites.Read.All']
};

// API маршруты для аккаунтов
app.get('/api/accounts', (req, res) => {
    res.json(accounts);
});

app.post('/api/accounts', (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Имя и email обязательны' });
    }

    const newAccount = {
        id: Date.now(),
        name,
        email
    };

    accounts.push(newAccount);
    res.status(201).json(newAccount);
});

app.delete('/api/accounts/:id', (req, res) => {
    const accountId = parseInt(req.params.id);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);

    if (accountIndex === -1) {
        return res.status(404).json({ error: 'Аккаунт не найден' });
    }

    accounts.splice(accountIndex, 1);
    res.json({ message: 'Аккаунт успешно удален' });
});

// Маршруты для файлов (имитация)
app.get('/api/accounts/:id/files', (req, res) => {
    const files = [
        { id: 'file1', name: 'Документ1.docx', size: '245 KB' },
        { id: 'file2', name: 'Фото.jpg', size: '1.2 MB' },
        { id: 'file3', name: 'Отчет.xlsx', size: '380 KB' }
    ];
    res.json(files);
});

app.delete('/api/accounts/:accountId/files/:fileId', (req, res) => {
    res.json({ message: 'Файл успешно удален' });
});

// OneDrive аутентификация
app.get('/api/accounts/:id/onedrive/auth', (req, res) => {
    const accountId = req.params.id;
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` + 
        `client_id=${ONE_DRIVE_CONFIG.clientId}&` + 
        `redirect_uri=${encodeURIComponent(ONE_DRIVE_CONFIG.redirectUri)}&` + 
        `response_type=code&` + 
        `scope=${encodeURIComponent(ONE_DRIVE_CONFIG.scopes.join(' '))}&` + 
        `state=${accountId}`;

    res.json({ authUrl });
});

app.get('/auth/callback', async (req, res) => {
    const { code, state: accountId } = req.query;
    
    try {
        // Обмен кода на токен
        const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            client_id: ONE_DRIVE_CONFIG.clientId,
            client_secret: ONE_DRIVE_CONFIG.clientSecret,
            code: code,
            redirect_uri: ONE_DRIVE_CONFIG.redirectUri,
            grant_type: 'authorization_code'
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Сохраняем токен для аккаунта
        accountTokens[accountId] = {
            accessToken: tokenResponse.data.access_token,
            refreshToken: tokenResponse.data.refresh_token,
            expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000)
        };

        // Перенаправляем пользователя обратно на главную страницу с параметром успешной аутентификации
        res.redirect(`/?auth_success=true&account_id=${accountId}`);
    } catch (error) {
        console.error('Ошибка аутентификации OneDrive:', error.response?.data || error.message);
        res.redirect(`/?auth_error=true`);
    }
});

// Получение файлов из OneDrive
app.get('/api/accounts/:id/onedrive/files', async (req, res) => {
    const accountId = req.params.id;
    
    try {
        // Проверяем, есть ли токен для этого аккаунта
        if (!accountTokens[accountId]) {
            return res.status(401).json({ error: 'Аккаунт не авторизован в OneDrive' });
        }

        // Проверяем, не истек ли токен
        if (accountTokens[accountId].expiresAt < Date.now()) {
            return res.status(401).json({ error: 'Токен доступа истек. Пожалуйста, авторизуйтесь снова.' });
        }

        // В реальном приложении здесь будет запрос к Microsoft Graph API
        // Для демо-версии возвращаем тестовые данные
        const demoFiles = [
            { id: 'file1', name: 'Документ1.docx', size: '245 KB', isFolder: false },
            { id: 'file2', name: 'Фотографии', size: '', isFolder: true },
            { id: 'file3', name: 'Отчет.xlsx', size: '380 KB', isFolder: false },
            { id: 'file4', name: 'Проекты', size: '', isFolder: true }
        ];

        res.json(demoFiles);
    } catch (error) {
        console.error('Ошибка получения файлов OneDrive:', error.response?.data || error.message);
        res.status(500).json({ error: 'Ошибка при получении файлов OneDrive' });
    }
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Обработка 404 ошибок
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 OneDrive Manager запущен на http://localhost:${PORT}`);
    console.log('🔧 Режим разработки');
    console.log('📝 Для добавления новых аккаунтов используйте веб-интерфейс');
    
    // Выводим информацию о настройках OneDrive
    console.log('\nℹ️  OneDrive настройки:');
    console.log(`   Client ID: ${ONE_DRIVE_CONFIG.clientId.substring(0, 8)}...`);
    console.log(`   Redirect URI: ${ONE_DRIVE_CONFIG.redirectUri}`);
    console.log(`   Scopes: ${ONE_DRIVE_CONFIG.scopes.join(', ')}`);
});

module.exports = app;