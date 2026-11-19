// Búsqueda por texto: «termo», «botellas» o «audifono» encuentran la categoría correcta.
// Las palabras son las mismas que usa el buscador de frontend/index.html.

export const PALABRAS = {
  botella:     ['botella', 'termo', 'cilindro', 'vaso', 'agua', 'stanley', 'hydro'],
  cargador:    ['cargador', 'cable', 'eliminador', 'power bank', 'powerbank', 'bateria'],
  llaves:      ['llave', 'llaves', 'llavero'],
  sueter:      ['sueter', 'sudadera', 'chamarra', 'chaqueta', 'hoodie', 'ropa', 'abrigo'],
  libreta:     ['libreta', 'cuaderno', 'apuntes', 'carpeta', 'agenda'],
  audifonos:   ['audifonos', 'audifono', 'airpods', 'auriculares', 'headphones', 'diadema'],
  laptop:      ['laptop', 'computadora', 'compu', 'notebook', 'macbook', 'portatil'],
  celular:     ['celular', 'telefono', 'iphone', 'movil', 'smartphone'],
  credencial:  ['credencial', 'identificacion', 'ine', 'tarjeta', 'gafete'],
  cartera:     ['cartera', 'billetera', 'monedero'],
  calculadora: ['calculadora', 'casio'],
  lentes:      ['lentes', 'gafas', 'anteojos', 'lente'],
  paraguas:    ['paraguas', 'sombrilla'],
  mochila:     ['mochila', 'bolsa', 'backpack', 'morral', 'lonchera'],
  usb:         ['usb', 'memoria', 'pendrive'],
  tablet:      ['tablet', 'ipad', 'tableta'],
  libro:       ['libro', 'libros'],
  casco:       ['casco', 'cascos', 'casco de moto', 'casco de bici', 'helmet'],
  otro:        []
};

/** Minúsculas y sin acentos: «Audífonos» → «audifonos». */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function variantes(palabra) {
  const v = [palabra];
  if (palabra.length > 4 && palabra.endsWith('es')) v.push(palabra.slice(0, -2));
  if (palabra.length > 3 && palabra.endsWith('s')) v.push(palabra.slice(0, -1));
  return v;
}

/**
 * Convierte lo que escribió la persona en:
 *  - tipos: categorías que coinciden (por ejemplo ['botella'])
 *  - patrones: patrones LIKE para buscar en el nombre de los objetos «Otro»
 * Devuelve null si no escribió nada.
 */
export function interpretarBusqueda(texto) {
  const q = normalizar(texto);
  if (!q) return null;

  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const tipos = Object.entries(PALABRAS)
    .filter(([, palabras]) =>
      palabras.some((k) => k.includes(' ') && (k.includes(q) || q.includes(k))) ||
      tokens.some((t) =>
        variantes(t).some((v) =>
          palabras.some((k) => k === v || k.startsWith(v) || (k.length >= 4 && v.startsWith(k)))
        )
      )
    )
    .map(([id]) => id);

  const largos = tokens.filter((t) => t.length >= 3);
  const patrones = (largos.length ? largos : [q]).map((t) => `%${t.replace(/[%_\\]/g, '\\$&')}%`);

  return { tipos, patrones };
}
