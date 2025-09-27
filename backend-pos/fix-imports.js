const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'src', 'routes');
const validationPath = path.join(__dirname, 'src', 'middleware', 'validation');

// Lista de archivos de rutas que necesitan corrección
const routeFiles = [
    'categorias.js',
    'dashboard.js',
    'productos.js',
    'proveedores.js',
    'ventas.js',
    'reportes.js',
    'alertas.js',
    'ofertas.js',
    'comprobantes.js',
    'detalleVenta.js',
    'productoOferta.js',
    'usuarios.js'
];

// Patrones de corrección
const patterns = [
    {
        old: /const validation = require\('\.\.\/middleware\/validation\/([^']+)'\);/g,
        new: `const $1Validations = require('../middleware/validation/$1');`
    },
    {
        old: /validation\.([a-zA-Z]+)\./g,
        new: `$1Validations.`
    }
];

routeFiles.forEach(file => {
    const filePath = path.join(routesPath, file);
    
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // Aplicar correcciones
        patterns.forEach(pattern => {
            content = content.replace(pattern.old, pattern.new);
        });
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Corregido: ${file}`);
        } else {
            console.log(`✓ Ya corregido: ${file}`);
        }
    } else {
        console.log(`❌ No existe: ${file}`);
    }
});

console.log('\n🎉 Todas las importaciones han sido corregidas!');