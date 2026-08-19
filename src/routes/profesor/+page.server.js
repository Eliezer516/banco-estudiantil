import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db } from '../../lib/server/db/index.js'
import { estudiantes, transacciones } from '../../lib/server/db/schema.js'

const SESSION_COOKIE = 'teacher_session';

function formatTimestamp(date = new Date()) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function extraerCedula(input) {
    const texto = String(input ?? '').trim();
    if (!texto) return NaN;

    const match = texto.match(/(?:^|[?&]data=)(\d+)/);
    if (match) return Number(match[1]);

    const numero = Number(texto);
    return Number.isNaN(numero) ? NaN : numero;
}

function normalizarClave(clave) {
    return String(clave).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
    if (cookies.get(SESSION_COOKIE) !== 'ok') {
        return { autenticado: false, estudiantes: [] };
    }

    const lista = await db.select().from(estudiantes);
    return { autenticado: true, estudiantes: lista };
}

export const actions = {
    login: async ({ request, cookies }) => {
        const data = Object.fromEntries(await request.formData());
        const password = String(data.password ?? '');

        if (!env.TEACHER_PASSWORD) {
            return fail(500, { loginError: 'Credenciales del profesor no configuradas' });
        }
        if (password !== env.TEACHER_PASSWORD) {
            return fail(401, { loginError: 'Contraseña incorrecta' });
        }

        cookies.set(SESSION_COOKIE, 'ok', {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 8
        });
    },

    logout: async ({ cookies }) => {
        cookies.delete(SESSION_COOKIE, { path: '/' });
    },

    debit: async ({ request, cookies }) => {
        if (cookies.get(SESSION_COOKIE) !== 'ok') {
            throw error(401, 'No autorizado');
        }

        const data = Object.fromEntries(await request.formData());
        const monto = Number(data.monto);
        const cedula = extraerCedula(data.cedula);
        const descripcion = String(data.descripcion ?? '').trim();

        if (Number.isNaN(monto) || monto <= 0) {
            return fail(400, { debitError: 'Monto inválido' });
        }
        if (Number.isNaN(cedula)) {
            return fail(400, { debitError: 'QR o cédula inválido' });
        }
        if (descripcion.length > 200) {
            return fail(400, { debitError: 'La descripción no puede superar los 200 caracteres' });
        }

        const estudiante = await db.select().from(estudiantes).where(eq(estudiantes.cedula, cedula)).get();

        if (!estudiante) {
            return fail(404, { debitError: 'Estudiante no encontrado' });
        }
        if (Number(estudiante.saldo) < monto) {
            return fail(400, { debitError: 'Saldo insuficiente' });
        }

        const nuevoSaldo = Number(estudiante.saldo) - monto;

        await db.transaction(async (tx) => {
            await tx.update(estudiantes).set({ saldo: nuevoSaldo }).where(eq(estudiantes.cedula, cedula));

            await tx.insert(transacciones).values({
                id: randomBytes(8).toString('hex'),
                cedulaOrigen: cedula,
                cedulaDestino: cedula,
                monto,
                descripcion: descripcion || 'Débito realizado por el profesor',
                timestamp: formatTimestamp(),
                tipo: 'debito'
            });
        });

        return { debitOk: true };
    },

    credito: async ({ request, cookies }) => {
        if (cookies.get(SESSION_COOKIE) !== 'ok') {
            throw error(401, 'No autorizado');
        }

        const data = Object.fromEntries(await request.formData());
        const monto = Number(data.monto);
        const cedula = extraerCedula(data.cedula);
        const descripcion = String(data.descripcion ?? '').trim();

        if (Number.isNaN(monto) || monto <= 0) {
            return fail(400, { creditoError: 'Monto inválido' });
        }
        if (Number.isNaN(cedula)) {
            return fail(400, { creditoError: 'QR o cédula inválido' });
        }
        if (descripcion.length > 200) {
            return fail(400, { creditoError: 'La descripción no puede superar los 200 caracteres' });
        }

        const estudiante = await db.select().from(estudiantes).where(eq(estudiantes.cedula, cedula)).get();

        if (!estudiante) {
            return fail(404, { creditoError: 'Estudiante no encontrado' });
        }

        const nuevoSaldo = Number(estudiante.saldo) + monto;

        await db.transaction(async (tx) => {
            await tx.update(estudiantes).set({ saldo: nuevoSaldo }).where(eq(estudiantes.cedula, cedula));

            await tx.insert(transacciones).values({
                id: randomBytes(8).toString('hex'),
                cedulaOrigen: cedula,
                cedulaDestino: cedula,
                monto,
                descripcion: descripcion || 'Acreditado por el profesor',
                timestamp: formatTimestamp(),
                tipo: 'credito'
            });
        });

        return { creditoOk: true };
    },

    importar: async ({ request, cookies }) => {
        if (cookies.get(SESSION_COOKIE) !== 'ok') {
            throw error(401, 'No autorizado');
        }

        const data = await request.formData();
        const archivo = data.get('archivo');

        if (!archivo || typeof archivo === 'string') {
            return fail(400, { importError: 'Selecciona un archivo' });
        }

        const nombre = archivo.name.toLowerCase();
        if (!nombre.endsWith('.xlsx') && !nombre.endsWith('.xls') && !nombre.endsWith('.csv')) {
            return fail(400, { importError: 'Formato no soportado. Usa archivos .xlsx o .csv' });
        }

        const XLSX = await import('xlsx');

        let libro;
        try {
            if (nombre.endsWith('.csv')) {
                libro = XLSX.read(await archivo.text(), { type: 'string' });
            } else {
                libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
            }
        } catch (e) {
            return fail(400, { importError: 'No se pudo leer el archivo' });
        }

        const hoja = libro.Sheets[libro.SheetNames[0]];
        if (!hoja) {
            return fail(400, { importError: 'El archivo no contiene hojas de datos' });
        }

        const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });
        if (filas.length === 0) {
            return fail(400, { importError: 'El archivo no contiene datos' });
        }

        const cedulasExistentes = new Set(
            (await db.select({ cedula: estudiantes.cedula }).from(estudiantes)).map((e) => e.cedula)
        );

        const nuevos = [];
        let duplicados = 0;
        let invalidos = 0;

        for (const fila of filas) {
            const campos = {};
            for (const [clave, valor] of Object.entries(fila)) {
                campos[normalizarClave(clave)] = String(valor).trim();
            }

            const cedula = Number(campos.cedula);
            const apellidos = campos.apellidos || campos.apellido;
            const nombres = campos.nombres || campos.nombre;
            const saldo = campos.saldo ? Number(campos.saldo) : 0;

            if (!Number.isInteger(cedula) || !apellidos || !nombres) {
                invalidos++;
                continue;
            }
            if (cedulasExistentes.has(cedula)) {
                duplicados++;
                continue;
            }

            cedulasExistentes.add(cedula);
            nuevos.push({
                cedula,
                apellidos,
                nombres,
                saldo: Number.isNaN(saldo) ? 0 : saldo,
                qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cedula}`
            });
        }

        let agregados = 0;
        if (nuevos.length > 0) {
            try {
                const resultado = await db.insert(estudiantes).values(nuevos).returning({ cedula: estudiantes.cedula });
                agregados = resultado.length;
            } catch (e) {
                return fail(400, { importError: 'Error al guardar los estudiantes en la base de datos' });
            }
        }

        return {
            importResult: {
                total: filas.length,
                agregados,
                duplicados,
                invalidos
            }
        };
    },

    registrar: async ({ request, cookies }) => {
        if (cookies.get(SESSION_COOKIE) !== 'ok') {
            throw error(401, 'No autorizado');
        }

        const data = Object.fromEntries(await request.formData());
        const cedula = Number(data.cedula);
        const nombres = String(data.nombres ?? '').trim();
        const apellidos = String(data.apellidos ?? '').trim();
        const saldo = data.saldo === '' || data.saldo === undefined ? 0 : Number(data.saldo);

        if (!Number.isInteger(cedula) || !nombres || !apellidos) {
            return fail(400, { registrarError: 'Completa cédula, nombres y apellidos correctamente' });
        }
        if (Number.isNaN(saldo) || saldo < 0) {
            return fail(400, { registrarError: 'Saldo inválido' });
        }

        const existente = await db.select().from(estudiantes).where(eq(estudiantes.cedula, cedula)).get();
        if (existente) {
            return fail(400, { registrarError: 'Ya existe un estudiante con esa cédula' });
        }

        try {
            await db.insert(estudiantes).values({
                cedula,
                nombres,
                apellidos,
                saldo,
                qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cedula}`
            });
        } catch (e) {
            return fail(400, { registrarError: 'Error al guardar el estudiante' });
        }

        return { registrarOk: true };
    },

    editar: async ({ request, cookies }) => {
        if (cookies.get(SESSION_COOKIE) !== 'ok') {
            throw error(401, 'No autorizado');
        }

        const data = Object.fromEntries(await request.formData());
        const cedulaOriginal = Number(data.cedulaOriginal);
        const cedula = Number(data.cedula);
        const nombres = String(data.nombres ?? '').trim();
        const apellidos = String(data.apellidos ?? '').trim();
        const saldo = data.saldo === '' || data.saldo === undefined ? 0 : Number(data.saldo);

        if (!Number.isInteger(cedulaOriginal) || !Number.isInteger(cedula)) {
            return fail(400, { editarError: 'Cédula inválida' });
        }
        if (!nombres || !apellidos) {
            return fail(400, { editarError: 'Completa nombres y apellidos' });
        }
        if (Number.isNaN(saldo) || saldo < 0) {
            return fail(400, { editarError: 'Saldo inválido' });
        }

        if (cedulaOriginal !== cedula) {
            const existe = await db.select().from(estudiantes).where(eq(estudiantes.cedula, cedula)).get();
            if (existe) {
                return fail(400, { editarError: 'Ya existe un estudiante con esa cédula' });
            }
            await db.transaction(async (tx) => {
                await tx.delete(transacciones).where(eq(transacciones.cedulaOrigen, cedulaOriginal));
                await tx.delete(estudiantes).where(eq(estudiantes.cedula, cedulaOriginal));
                await tx.insert(estudiantes).values({
                    cedula,
                    nombres,
                    apellidos,
                    saldo,
                    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cedula}`
                });
            });
        } else {
            await db.update(estudiantes).set({ nombres, apellidos, saldo }).where(eq(estudiantes.cedula, cedula));
        }

        return { editarOk: true };
    },

    eliminar: async ({ request, cookies }) => {
        if (cookies.get(SESSION_COOKIE) !== 'ok') {
            throw error(401, 'No autorizado');
        }

        const data = Object.fromEntries(await request.formData());
        const cedula = Number(data.cedula);

        if (Number.isNaN(cedula)) {
            return fail(400, { eliminarError: 'Cédula inválida' });
        }

        const estudiante = await db.select().from(estudiantes).where(eq(estudiantes.cedula, cedula)).get();
        if (!estudiante) {
            return fail(404, { eliminarError: 'Estudiante no encontrado' });
        }

        await db.transaction(async (tx) => {
            await tx.delete(transacciones).where(eq(transacciones.cedulaOrigen, cedula));
            await tx.delete(estudiantes).where(eq(estudiantes.cedula, cedula));
        });

        return { eliminarOk: true };
    }
};
