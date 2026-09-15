export const CATEGORIAS = ['Lacteos', 'Carnes', 'Frutas', 'Verduras', 'Despensa', 'Bebidas', 'Congelados', 'Snacks', 'Otros'] as const;

export function texto(value: unknown, campo: string, max: number, min = 0): string {
  if (typeof value !== 'string') throw new Error(`${campo}: usa texto.`);
  const limpio = value.trim();
  if (limpio.length < min || limpio.length > max || /[\u0000-\u001f\u007f]/.test(limpio)) {
    throw new Error(`${campo}: usa entre ${min} y ${max} caracteres, sin saltos de línea.`);
  }
  return limpio;
}

export function codigoValido(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{8,14}$/.test(value)) {
    throw new Error('El código de barras debe contener entre 8 y 14 dígitos.');
  }
  return value;
}

export function idValido(value: string): string {
  if (!value || value.includes('/') || value === '.' || value === '..' || value.length > 500) {
    throw new Error('Identificador inválido.');
  }
  return value;
}

export function validarPassword(password: string): void {
  if (password.length < 12 || password.length > 128) {
    throw new Error('Usa una contraseña de entre 12 y 128 caracteres. Puedes usar una frase larga.');
  }
}
