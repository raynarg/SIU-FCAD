import fs from 'fs';
import path from 'path';
import swaggerSpec from '../src/config/swagger.js';

const outputPath = path.resolve(process.cwd(), 'swagger.json');

try {
    fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
    console.log(`Documentación Swagger generada con éxito en: ${outputPath}`);
} catch (error) {
    console.error('Error al generar la documentación Swagger:', error);
    process.exit(1);
}
