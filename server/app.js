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

// Массив для хранения файлов (имитация)
const files = {
    1: [
        { id: 'file1', name: 'Документ1.docx', size: '245 KB' },
        { id: 'file2', name: 'Фото.jpg', size: '1.2 MB' }
    ],
    2: [
        { id: 'file3', name: 'Отчет.xlsx', size: '380 KB' },
        { id: 'file4', name: 'Презентация.pptx', size: '2.1 MB' }
    ]
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
    
    // Удаляем связанные файлы (если они есть)
    delete files[accountId];
    
    res.json({ message: 'Аккаунт успешно удален' });
});

// API маршруты для файлов
app.get('/api/accounts/:id/files', (req, res) => {
    const accountId = parseInt(req.params.id);
    
    if (!files[accountId]) {
        return res.json([]);
    }
    
    res.json(files[accountId]);
});

app.delete('/api/accounts/:accountId/files/:fileId', (req, res) => {
    const accountId = parseInt(req.params.accountId);
    const fileId = req.params.fileId;
    
    if (!files[accountId]) {
        return res.status(404).json({ error: 'Аккаунт не найден' });
    }
    
    const fileIndex = files[accountId].findIndex(file => file.id === fileId);
    
    if (fileIndex === -1) {
        return res.status(404).json({ error: 'Файл не найден' });
    }
    
    files[accountId].splice(fileIndex, 1);
    res.json({ message: 'Файл успешно удален' });
});

app.get('/api/accounts/:accountId/files/:fileId/download', (req, res) => {
    // В реальном приложении здесь будет логика скачивания файла из OneDrive
    const fileId = req.params.fileId;
    res.json({ 
        message: 'Файл успешно скачан', 
        fileId: fileId,
        url: `https://example.com/files/${fileId}`
    });
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
});

module.exports = app;