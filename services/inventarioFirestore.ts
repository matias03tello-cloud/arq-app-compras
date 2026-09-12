import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { obtenerUidActual, usuarioActual } from './auth';
import { ProductoInventario } from './productos';

const COLECCION_INVENTARIO = 'inventario';
const STORAGE_ANTIGUO = '@inventario_abuelitas_v4';
const USUARIO_DEMO_ANTIGUO = 'usuario_demo';

export type EstadoVencimiento =
  | 'vencido'
  | 'urgente'
  | 'pronto'
  | 'atencion'
  | 'bien'
  | 'sin-fecha';

export interface EstadoProducto {
  estado: EstadoVencimiento;
  dias: number | null;
  etiqueta: string;
}

function normalizarProducto(
  data: Partial<ProductoInventario>,
  id: string
): ProductoInventario {
  return {
    id,
    codigoBarras: data.codigoBarras ?? '',
    nombre: data.nombre ?? 'Producto',
    marca: data.marca ?? 'Sin marca',
    categoria: data.categoria ?? 'Otros',
    formato: data.formato ?? '',
    unidad: data.unidad ?? 'unidad',
    cantidad: Number(data.cantidad) > 0 ? Number(data.cantidad) : 1,
    vencimiento: data.vencimiento ?? 'Sin fecha',
    fechaRegistro: data.fechaRegistro ?? '',
  };
}

export async function obtenerInventario(): Promise<ProductoInventario[]> {
  const usuario = usuarioActual();
  if (!usuario) return [];
  const uid = usuario.uid;

  try {
    const referencia = collection(db, COLECCION_INVENTARIO);
    const consulta = query(referencia, where('usuarioId', '==', uid));
    const resultado = await getDocs(consulta);

    return resultado.docs.map((documento) =>
      normalizarProducto(
        documento.data() as Partial<ProductoInventario>,
        documento.id
      )
    );
  } catch (error) {
    console.error('Error obteniendo inventario desde Firestore:', error);
    throw error;
  }
}

export async function agregarAlInventario(
  producto: ProductoInventario
): Promise<ProductoInventario> {
  const uid = obtenerUidActual();

  try {
    const { id: _idLocal, ...datosProducto } = producto;

    const referencia = await addDoc(collection(db, COLECCION_INVENTARIO), {
      ...datosProducto,
      usuarioId: uid,
      creadoEn: serverTimestamp(),
    });

    return {
      ...producto,
      id: referencia.id,
    };
  } catch (error) {
    console.error('Error agregando producto al inventario:', error);
    throw error;
  }
}

export async function eliminarProductoInventario(id: string): Promise<void> {
  const uid = obtenerUidActual();

  try {
    // Verificamos que el documento esté dentro del inventario visible del usuario.
    const propios = await getDocs(
      query(
        collection(db, COLECCION_INVENTARIO),
        where('usuarioId', '==', uid)
      )
    );

    if (!propios.docs.some((item) => item.id === id)) {
      throw new Error('No puedes eliminar un producto que no pertenece a tu cuenta.');
    }

    await deleteDoc(doc(db, COLECCION_INVENTARIO, id));
  } catch (error) {
    console.error('Error eliminando producto del inventario:', error);
    throw error;
  }
}

export async function vaciarInventarioUsuario(): Promise<number> {
  const uid = obtenerUidActual();

  const resultado = await getDocs(
    query(
      collection(db, COLECCION_INVENTARIO),
      where('usuarioId', '==', uid)
    )
  );

  await Promise.all(
    resultado.docs.map((documento) => deleteDoc(documento.ref))
  );

  return resultado.size;
}

// Compatibilidad con las versiones anteriores del proyecto.
// 1) Si aún existe el inventario local, lo sube a la cuenta actual.
// 2) Si la versión anterior ya lo migró como "usuario_demo", lo adopta una vez
//    hacia la primera cuenta real que se use y que todavía no tenga inventario.
export async function migrarInventarioLocalAFirestore(): Promise<number> {
  const usuario = usuarioActual();
  if (!usuario) return 0;
  const uid = usuario.uid;
  const marcaMigracion = `@frescapp_migracion_auth_v1_${uid}`;

  try {
    const yaMigrado = await AsyncStorage.getItem(marcaMigracion);
    if (yaMigrado === '1') return 0;

    const inventarioUsuario = await obtenerInventario();
    let migrados = 0;

    if (inventarioUsuario.length === 0) {
      const datosLocales = await AsyncStorage.getItem(STORAGE_ANTIGUO);

      if (datosLocales) {
        const lista = JSON.parse(datosLocales) as Partial<ProductoInventario>[];

        for (let i = 0; i < lista.length; i++) {
          const producto = normalizarProducto(
            lista[i],
            `migracion-${Date.now()}-${i}`
          );

          await agregarAlInventario(producto);
          migrados++;
        }

        await AsyncStorage.removeItem(STORAGE_ANTIGUO);
      } else {
        const demo = await getDocs(
          query(
            collection(db, COLECCION_INVENTARIO),
            where('usuarioId', '==', USUARIO_DEMO_ANTIGUO)
          )
        );

        if (!demo.empty) {
          await Promise.all(
            demo.docs.map((documento) =>
              updateDoc(documento.ref, {
                usuarioId: uid,
                migradoAUsuarioEn: serverTimestamp(),
              })
            )
          );
          migrados = demo.size;
        }
      }
    }

    await AsyncStorage.setItem(marcaMigracion, '1');
    return migrados;
  } catch (error) {
    console.error('Error migrando inventario a la cuenta actual:', error);
    throw error;
  }
}

export function fechaTextoADate(fechaStr: string): Date | null {
  if (!fechaStr || fechaStr === 'No visible' || fechaStr === 'Sin fecha') {
    return null;
  }

  const partes = fechaStr.trim().split('/').map(Number);

  if (partes.length === 3) {
    const [dia, mes, anio] = partes;

    if (!dia || !mes || !anio || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      return null;
    }

    const fecha = new Date(anio, mes - 1, dia);

    if (
      fecha.getFullYear() !== anio ||
      fecha.getMonth() !== mes - 1 ||
      fecha.getDate() !== dia
    ) {
      return null;
    }

    return fecha;
  }

  if (partes.length === 2) {
    const [mes, anio] = partes;
    if (!mes || !anio || mes < 1 || mes > 12) return null;
    return new Date(anio, mes, 0);
  }

  return null;
}

export function calcularDiasRestantes(fechaStr: string): number | null {
  const fechaVencimiento = fechaTextoADate(fechaStr);
  if (!fechaVencimiento) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaVencimiento.setHours(0, 0, 0, 0);

  return Math.ceil(
    (fechaVencimiento.getTime() - hoy.getTime()) / 86400000
  );
}

export function obtenerEstadoVencimiento(fechaStr: string): EstadoProducto {
  const dias = calcularDiasRestantes(fechaStr);

  if (dias === null) {
    return { estado: 'sin-fecha', dias: null, etiqueta: 'Sin fecha' };
  }

  if (dias < 0) {
    return {
      estado: 'vencido',
      dias,
      etiqueta: `Vencido hace ${Math.abs(dias)} d`,
    };
  }

  if (dias === 0) {
    return { estado: 'urgente', dias, etiqueta: 'Vence hoy' };
  }

  if (dias <= 3) {
    return { estado: 'urgente', dias, etiqueta: `Vence en ${dias} d` };
  }

  if (dias <= 7) {
    return { estado: 'pronto', dias, etiqueta: `Vence en ${dias} d` };
  }

  if (dias <= 15) {
    return { estado: 'atencion', dias, etiqueta: `Vence en ${dias} d` };
  }

  return { estado: 'bien', dias, etiqueta: `${dias} días` };
}

export function ordenarPorVencimiento(
  lista: ProductoInventario[]
): ProductoInventario[] {
  return [...lista].sort((a, b) => {
    const da = calcularDiasRestantes(a.vencimiento);
    const db = calcularDiasRestantes(b.vencimiento);

    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;

    return da - db;
  });
}
