import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(String(password), salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

export function verifyPassword(password, storedSaltAndHash) {
    if (!storedSaltAndHash || typeof storedSaltAndHash !== 'string') return false;
    const [salt, hash] = storedSaltAndHash.split(':');
    if (!salt || !hash) return false;

    const intento = Buffer.from(scryptSync(String(password), salt, 64).toString('hex'), 'hex');
    const original = Buffer.from(hash, 'hex');
    return intento.length === original.length && timingSafeEqual(intento, original);
}