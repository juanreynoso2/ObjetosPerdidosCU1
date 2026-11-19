/** Error causado por datos que mandó el usuario: responde 400 con detalles por campo. */
export class ErrorDeDatos extends Error {
  constructor(mensaje, detalles = []) {
    super(mensaje);
    this.status = 400;
    this.detalles = detalles;
  }
}

// Códigos de PostgreSQL que significan «datos inválidos», no «falla del servidor».
const ERRORES_PG = {
  '22P02': [400, 'Algún dato tiene un formato inválido'],
  '22007': [400, 'La fecha u hora no es válida'],
  '22008': [400, 'La fecha u hora no es válida'],
  '23502': [400, 'Falta un dato obligatorio'],
  '23503': [400, 'Algún dato hace referencia a algo que no existe'],
  '23514': [400, 'Algún dato no cumple las reglas'],
  '23505': [409, 'Ese registro ya existe'],
  '42501': [403, 'No tienes permiso para esa acción']
};

/** Último middleware de Express: convierte cualquier error en una respuesta JSON en español. */
// eslint-disable-next-line no-unused-vars
export function manejadorDeErrores(err, req, res, next) {
  if (err instanceof ErrorDeDatos) {
    return res.status(400).json({ error: err.message, detalles: err.detalles });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición debe ser JSON válido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande' });
  }
  if (err.code && ERRORES_PG[err.code]) {
    const [status, mensaje] = ERRORES_PG[err.code];
    return res.status(status).json({ error: mensaje });
  }
  console.error(err);
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Intenta de nuevo.' });
}
