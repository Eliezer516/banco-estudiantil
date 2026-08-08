import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ==========================================
// Tabla: Estudiantes
// ==========================================
export const estudiantes = sqliteTable('estudiantes', {
  /**
   * Cédula de identidad (Clave primaria).
   * Almacenado como integer según los registros del CSV.
   */
  cedula: integer('cedula').primaryKey(),
  
  apellidos: text('apellidos').notNull(),
  nombres: text('nombres').notNull(),
  
  /**
   * Saldo disponible del estudiante.
   * Se utiliza real() para permitir montos o decimales.
   */
  saldo: real('saldo').notNull().default(0),
  
  /**
   * URL de código QR generado para el estudiante.
   */
  qrCode: text('qr_code').notNull(),
});

// ==========================================
// Tabla: Transacciones
// ==========================================
export const transacciones = sqliteTable('transacciones', {
  /**
   * ID único de la transacción (hash/hexadecimal de 8 caracteres).
   */
  id: text('id').primaryKey(),
  
  /**
   * Cédula del estudiante origen (FK a estudiantes.cedula)
   */
  cedulaOrigen: integer('cedula_origen')
    .notNull()
    .references(() => estudiantes.cedula),
    
  /**
   * Cédula del estudiante destino (FK a estudiantes.cedula)
   */
  cedulaDestino: integer('cedula_destino')
    .notNull()
    .references(() => estudiantes.cedula),
    
  monto: real('monto').notNull(),
  descripcion: text('descripcion'),
  
  /**
   * Timestamp de la transacción. 
   * Se almacena como string si mantienes el formato legible (ej: "8/8/2026 8:35:37") 
   * o se puede usar ISO 8601 / modo timestamp según prefieras.
   */
  timestamp: text('timestamp').notNull(),
  
  /**
   * Tipo de movimiento ('debito' | 'credito').
   */
  tipo: text('tipo', { enum: ['debito', 'credito'] }).notNull(),
});

// ==========================================
// Relaciones (Drizzle Relations API)
// ==========================================

export const estudiantesRelations = relations(estudiantes, ({ many }) => ({
  transaccionesEnviadas: many(transacciones, {
    relationName: 'transacciones_enviadas',
  }),
  transaccionesRecibidas: many(transacciones, {
    relationName: 'transacciones_recibidas',
  }),
}));

export const transaccionesRelations = relations(transacciones, ({ one }) => ({
  estudianteOrigen: one(estudiantes, {
    fields: [transacciones.cedulaOrigen],
    references: [estudiantes.cedula],
    relationName: 'transacciones_enviadas',
  }),
  estudianteDestino: one(estudiantes, {
    fields: [transacciones.cedulaDestino],
    references: [estudiantes.cedula],
    relationName: 'transacciones_recibidas',
  }),
}));