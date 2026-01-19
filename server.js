// Servidor simple con Node.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Eliminar query params para el manejo de archivos
    let url = req.url.split('?')[0];
    
    // Configuración de rutas similar a vercel.json
    
    // 1. Root -> index.html en pages
    if (url === '/') {
        url = '/src/pages/index.html';
    }
    
    // 2. Mapear carpetas de recursos a src/
    if (url.startsWith('/css/') || url.startsWith('/js/') || url.startsWith('/images/')) {
        url = '/src' + url;
    }
    
    // 3. Mapear archivos HTML sueltos a src/pages/
    // Evitar doble mapeo si ya empieza con /src/
    if (url.endsWith('.html') && !url.startsWith('/src/')) {
        url = '/src/pages' + url;
    }

    let filePath = '.' + url;

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - Archivo no encontrado</h1><p>Buscando en: ' + filePath + '</p>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Error del servidor: ' + error.code + ' ..\n');
            }
        } else {
            // Agregar headers para prevenir caché
            const headers = {
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0'
            };
            res.writeHead(200, headers);
            res.end(content, 'utf-8');
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    console.log('Presiona Ctrl+C para detener el servidor');
});
