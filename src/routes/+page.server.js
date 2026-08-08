import { error, fail } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { and, eq, or, desc } from 'drizzle-orm'
import { db } from '../lib/server/db/index.js'
import { estudiantes, transacciones } from '../lib/server/db/schema.js'

const SESSION_COOKIE = 'student_session';

function formatTimestamp(date = new Date()) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
    const cedula = cookies.get(SESSION_COOKIE);
    if (!cedula) return { estudiante: null, historial: [] };

    const estudiante = await db.select().from(estudiantes).where(eq(estudiantes.cedula, Number(cedula))).get();

    if (!estudiante) {
        cookies.delete(SESSION_COOKIE, { path: '/' });
        return { estudiante: null, historial: [] };
    }

    const historial = await db.select().from(transacciones).where(
        or(
            eq(transacciones.cedulaOrigen, estudiante.cedula),
            eq(transacciones.cedulaDestino, estudiante.cedula)
        )
    ).orderBy(desc(transacciones.timestamp));

    return { estudiante, historial };
}

export const actions = {
    login: async ({ request, cookies }) => {
        const data = Object.fromEntries(await request.formData());
        const cedula = Number(data.cedula);

        if (Number.isNaN(cedula)) {
            return fail(400, { loginError: 'Cédula inválida' });
        }

        const estudiante = await db.select().from(estudiantes).where(eq(estudiantes.cedula, cedula)).get();

        if (!estudiante) {
            return fail(400, { loginError: 'Estudiante no encontrado' });
        }

        cookies.set(SESSION_COOKIE, String(cedula), {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
        });
    },

    logout: async ({ cookies }) => {
        cookies.delete(SESSION_COOKIE, { path: '/' });
    },

    transfer: async ({ request, cookies }) => {
        const cedulaOrigen = Number(cookies.get(SESSION_COOKIE));
        const data = Object.fromEntries(await request.formData());
        const monto = Number(data.monto);
        const cedulaDestino = Number(data.cedulaDestino);
        const descripcion = String(data.descripcion ?? '').trim();

        if (Number.isNaN(cedulaOrigen)) {
            return fail(401, { transferError: 'Debes iniciar sesión' });
        }
        if (Number.isNaN(monto) || monto <= 0) {
            return fail(400, { transferError: 'Monto inválido' });
        }
        if (Number.isNaN(cedulaDestino)) {
            return fail(400, { transferError: 'Cédula de destino inválida' });
        }
        if (cedulaOrigen === cedulaDestino) {
            return fail(400, { transferError: 'No puedes transferirte a ti mismo' });
        }
        if (!descripcion) {
            return fail(400, { transferError: 'Debes añadir una descripción' });
        }
        if (descripcion.length > 200) {
            return fail(400, { transferError: 'La descripción no puede superar los 200 caracteres' });
        }

        const [origen, destino] = await Promise.all([
            db.select().from(estudiantes).where(eq(estudiantes.cedula, cedulaOrigen)).get(),
            db.select().from(estudiantes).where(eq(estudiantes.cedula, cedulaDestino)).get()
        ]);

        if (!origen) {
            throw error(401, 'Debes iniciar sesión');
        }
        if (!destino) {
            return fail(400, { transferError: 'Estudiante de destino no encontrado' });
        }
        if (Number(origen.saldo) < monto) {
            return fail(400, { transferError: 'Saldo insuficiente' });
        }

        const idTransaccion = randomBytes(8).toString('hex');
        const timestamp = formatTimestamp();
        const descripcionFinal = `${descripcion}`;

        await db.transaction(async (tx) => {
            await tx.insert(transacciones).values({
                id: idTransaccion,
                cedulaOrigen,
                cedulaDestino,
                monto,
                descripcion: descripcionFinal,
                timestamp,
                tipo: 'debito'
            });

            await tx.update(estudiantes).set({ saldo: Number(origen.saldo) - monto }).where(eq(estudiantes.cedula, cedulaOrigen));
            await tx.update(estudiantes).set({ saldo: Number(destino.saldo) + monto }).where(eq(estudiantes.cedula, cedulaDestino));
        });

        return {
            transferOk: true,
            recibo: {
                id: idTransaccion,
                monto,
                cedulaDestino,
                descripcion: descripcionFinal,
                timestamp
            }
        };
    }
};
