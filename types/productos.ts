export type CategoriaProducto =
  | 'Lacteos'
  | 'Carnes'
  | 'Frutas'
  | 'Verduras'
  | 'Despensa'
  | 'Bebidas'
  | 'Congelados'
  | 'Snacks'
  | 'Otros';


export interface ProductoCatalogo {
  codigoBarras: string;
  nombre: string;
  marca: string;
  categoria: CategoriaProducto;
  formato: string;
  unidad: string;
  activo: boolean;
}


export interface ProductoInventario {
  id: string;
  codigoBarras: string;
  nombre: string;
  marca: string;
  categoria: CategoriaProducto;
  vencimiento: string;
  fechaRegistro: string;
}