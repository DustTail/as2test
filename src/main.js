const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs/promises');
const multer = require('multer');
const path = require('path');
const { AS2Composer, AS2Parser } = require('libas2');

const app = express();
const port = 3000;

app.use(bodyParser.text({ limit: '50mb' }));

const uploadDir = 'upload';

/**
 * Send file to server
 */
app.post('/send', multer().single('file'), async (req, res) => {
    const as2 = new AS2Composer({
        message: {
            filename: req.file.originalname,
            content: req.file.buffer
        },
        agreement: {
            host: {
                name: 'test1',
                id: 'test_1',
                url: 'https://localhost:3000'
            },
            partner: {
                name: 'test2',
                id: 'test_2',
                url: 'https://localost:3000'
            }
        }
    });

    await fs.writeFile(`${uploadDir}/${req.file.originalname}`, req.file.buffer);

    const message = await as2.compile();
    const stream = await message.build();

    res.write(stream);
    res.end();
});

/**
 * Read file from AS2 response
 */
app.post('/readFile', async (req, res) => {
    const file = await AS2Parser.parse(req.body);

    res.write(file.content);
    res.end();
});

/**
 * Read file from file system
 */
app.get('/messages/:filename', async (req, res) => {
    let error;
    let file;
    try {
        file = await fs.readFile(`${uploadDir}/${req.params.filename}`);
    } catch (e) {
        error = 'File not found';
    }

    res.write(file ?? error);
    res.end();
});

/**
 * Get list of uploaded files
 */
app.get('/messages', async (req, res) => {
    let filesList = await fs.readdir(uploadDir);

    filesList = filesList.filter(file => file !== '.gitkeep');

    const response = [];

    for (const file of filesList) {
        const stat = await fs.stat(`${uploadDir}/${file}`);

        response.push({
            filename: file,
            size: stat.size,
            extention: path.extname(file).replace('.', '')
        });
    }

    res.send(response);
});

app.listen(port, () => {
    console.info(`Example app listening on port ${port}`);
});
