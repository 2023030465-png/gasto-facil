const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../node_modules/exceljs/dist/exceljs.min.js');
const destDir = path.join(__dirname, '../public/vendor');
const destFile = path.join(destDir, 'exceljs.min.js');

try {
  // Verifica que el archivo de origen existe
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Error: No se encontró ${sourceFile}`);
    console.error('Asegúrate de que ExcelJS está instalado: npm install exceljs@4.4.0 --save');
    process.exit(1);
  }

  // Crea el directorio public/vendor si no existe
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`✓ Directorio creado: ${destDir}`);
  }

  // Copia el archivo
  fs.copyFileSync(sourceFile, destFile);
  console.log(`✓ ExcelJS copiado exitosamente a ${destFile}`);
} catch (error) {
  console.error(`❌ Error al copiar ExcelJS: ${error.message}`);
  process.exit(1);
}
