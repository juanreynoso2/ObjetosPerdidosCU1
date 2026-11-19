import { z } from 'zod';

const ID = /^[a-z]{2,15}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIAS_MAXIMOS = 90;

const textoOpcional = (max, mensaje) =>
  z.string({ error: mensaje }).trim().max(max, mensaje).optional().nullable();

/** Cuerpo de POST /api/objetos. Rechaza campos que no estén aquí (por ejemplo «estado»). */
export const esquemaReporte = z
  .strictObject({
    tipo: z.string({ error: 'Elige el tipo de objeto' }).regex(ID, 'Elige un tipo de objeto válido'),
    tipo_otro: textoOpcional(40, 'El nombre del objeto admite hasta 40 caracteres'),
    descripcion: textoOpcional(240, 'La descripción admite hasta 240 caracteres'),
    fecha: z.string({ error: 'Indica el día' }).regex(FECHA, 'La fecha debe tener el formato AAAA-MM-DD'),
    hora: z.string({ error: 'Indica la hora' }).regex(HORA, 'La hora debe tener el formato HH:MM'),
    zona_id: z.string({ error: 'Marca en el mapa dónde lo encontraste' }).regex(ID, 'Zona no válida'),
    lugar: z
      .string({ error: 'Escribe en qué parte lo encontraste' })
      .trim()
      .min(1, 'Escribe en qué parte lo encontraste')
      .max(80, 'El lugar admite hasta 80 caracteres'),
    x: z.number({ error: 'x debe ser un número' }).min(20, 'x está fuera del mapa').max(1270, 'x está fuera del mapa'),
    y: z.number({ error: 'y debe ser un número' }).min(140, 'y está fuera del mapa').max(980, 'y está fuera del mapa'),
    resguardo_id: z.string({ error: 'Punto de resguardo no válido' }).regex(ID, 'Punto de resguardo no válido').optional().nullable(),
    reportado_por: textoOpcional(60, 'Tu nombre o matrícula admite hasta 60 caracteres')
  })
  .superRefine((d, ctx) => {
    if (d.tipo === 'otro' && !d.tipo_otro) {
      ctx.addIssue({ code: 'custom', path: ['tipo_otro'], message: 'Escribe qué objeto es' });
    }
    if (FECHA.test(d.fecha) && HORA.test(d.hora)) {
      const momento = new Date(`${d.fecha}T${d.hora}:00`); // hora local (TZ=America/Mexico_City)
      const [a, m, dia] = d.fecha.split('-').map(Number);
      if (Number.isNaN(momento.getTime()) || momento.getDate() !== dia || momento.getMonth() + 1 !== m || momento.getFullYear() !== a) {
        ctx.addIssue({ code: 'custom', path: ['fecha'], message: 'La fecha no existe' });
      } else if (momento.getTime() > Date.now() + 10 * 60 * 1000) {
        ctx.addIssue({ code: 'custom', path: ['fecha'], message: 'La fecha y hora no pueden ser posteriores a ahora' });
      } else if (momento.getTime() < Date.now() - DIAS_MAXIMOS * 24 * 3600 * 1000) {
        ctx.addIssue({ code: 'custom', path: ['fecha'], message: `Solo se pueden reportar objetos encontrados en los últimos ${DIAS_MAXIMOS} días` });
      }
    }
  });

/** Parámetros de GET /api/objetos. */
export const esquemaBusqueda = z.object({
  q: z.string().trim().max(60, 'La búsqueda admite hasta 60 caracteres').optional(),
  tipo: z.string().regex(ID, 'Tipo de objeto no válido').optional(),
  desde: z.string().regex(FECHA, 'desde debe tener el formato AAAA-MM-DD').optional(),
  limite: z.coerce.number({ error: 'limite debe ser un número' }).int().min(1).max(500).default(300)
});

/** Convierte un error de zod en una respuesta 400 legible. */
export function detallesDeValidacion(error) {
  return error.issues.map((i) => ({
    campo: i.path.join('.') || null,
    mensaje: i.code === 'unrecognized_keys' ? `Campo no permitido: ${i.keys.join(', ')}` : i.message
  }));
}
