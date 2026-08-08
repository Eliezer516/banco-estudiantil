<script>
    import { enhance } from '$app/forms';

    let { data, form } = $props();

    let recibo = $state(null);
    let transferirDialog = $state(null);
    let reciboDialog = $state(null);

    function formatearCedula(cedula) {
        return String(cedula)
    }

    function toast(mensaje, titulo = '', variante = 'success') {
        window.ot?.toast?.(mensaje, titulo, { variant: variante });
    }

    function transferEnhancer() {
        return async ({ result, update }) => {
            await update();

            if (result.type === 'success' && result.data?.transferOk) {
                recibo = result.data.recibo;
                transferirDialog?.close();
                reciboDialog?.showModal();
            }
        };
    }

    async function compartirRecibo() {
        if (!recibo) return;

        const texto =
            `Comprobante de pago\n` +
            `Monto: $${recibo.monto.toFixed(2)}\n` +
            `Para: ${recibo.cedulaDestino}\n` +
            `Concepto: ${recibo.descripcion}\n` +
            `Fecha: ${recibo.timestamp}\n` +
            `N°: ${recibo.id}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: 'Comprobante de transferencia', text: texto });
            } catch (e) {}
        } else {
            try {
                await navigator.clipboard.writeText(texto);
                toast('Comprobante copiado al portapapeles', 'Listo');
            } catch (e) {
                toast('No se pudo compartir el comprobante', 'Error', 'danger');
            }
        }
    }
</script>

{#if data.estudiante}
    <main class="container mt-8 mb-8">
        <header class="hstack justify-between">
            <div>
                <h1>Hola, {data.estudiante.nombres} {data.estudiante.apellidos}</h1>
                <p class="text-light">Bienvenido a tu banco estudiantil.</p>
            </div>
            <div class="hstack">
                <button commandfor="dialog-transferir" command="show-modal">Transferir puntos</button>
                <form method="POST" action="?/logout" use:enhance>
                    <button data-variant="secondary" class="outline">Cerrar sesión</button>
                </form>
            </div>
        </header>

        <section class="virtual-card mt-6">
            <div class="vc-top">
                <span class="vc-bank">Banco Estudiantil</span>
            </div>
                {#if data.estudiante.qrCode}
                    <img class="vc-qr" src={data.estudiante.qrCode} alt="Código QR del estudiante" />
                {/if}
            <div class="vc-saldo">
                <p class="vc-label">Saldo disponible</p>
                <p class="vc-monto">${data.estudiante.saldo.toFixed(2)}</p>
            </div>
            <div class="vc-bottom">
                <div class="vc-info">
                    <p class="vc-label">Titular</p>
                    <p class="vc-value">{data.estudiante.nombres} {data.estudiante.apellidos}</p>
                </div>
                <div class="vc-info">
                    <p class="vc-label">Cédula</p>
                    <p class="vc-value">{formatearCedula(data.estudiante.cedula)}</p>
                </div>
            </div>
        </section>

        <article class="card mt-6">
            <h2>Historial de transacciones</h2>
            {#if data.historial.length === 0}
                <p class="text-light">Aún no tienes transacciones.</p>
            {:else}
                <div class="table">
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Monto</th>
                                <th>Concepto</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.historial as t}
                                {@const esOrigen = t.cedulaOrigen === data.estudiante.cedula}
                                {@const esDestino = t.cedulaDestino === data.estudiante.cedula}
                                {@const esProfesor = esOrigen && esDestino}
                                {@const esCreditoProfesor = esProfesor && t.tipo === 'credito'}
                                {@const esDebitoProfesor = esProfesor && t.tipo === 'debito'}
                                {@const filaClase = esProfesor ? '' : esOrigen ? 'hist-debito' : 'hist-credito'}
                                <tr class={filaClase}>
                                    <td>
                                        {#if esCreditoProfesor}
                                            <span class="badge" data-variant="success">Acreditado</span>
                                        {:else if esDebitoProfesor}
                                            <span class="badge" data-variant="secondary">Débito</span>
                                        {:else if esOrigen}
                                            <span class="badge" data-variant="danger">Enviado</span>
                                        {:else if esDestino}
                                            <span class="badge" data-variant="success">Recibido</span>
                                        {/if}
                                    </td>
                                    <td>
                                        {#if esOrigen && esDestino}
                                            ${t.monto.toFixed(2)}
                                        {:else if esOrigen}
                                            ${t.monto.toFixed(2)}
                                        {:else if esDestino}
                                            ${t.monto.toFixed(2)}
                                        {/if}
                                    </td>
                                    <td>
                                        {#if t.descripcion}
                                            <span class="text-light">{t.descripcion}</span>
                                        {/if}
                                    </td>
                                    <td>{t.timestamp}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </article>
    </main>

    <dialog id="dialog-transferir" bind:this={transferirDialog} closedby="any">
        <form method="POST" action="?/transfer" use:enhance={transferEnhancer}>
            <header>
                <h3>Transferir puntos</h3>
                <p class="text-light">Envía puntos a un compañero.</p>
            </header>
            <div class="vstack">
                <label data-field>
                    Cédula del compañero
                    <input type="number" name="cedulaDestino" required>
                </label>
                <label data-field>
                    Monto
                    <input type="number" name="monto" step="0.01" min="0" required>
                </label>
                <label data-field>
                    Descripción
                    <textarea name="descripcion" rows="3" maxlength="200" placeholder="¿Para qué es esta transferencia?" required></textarea>
                </label>
                {#if form?.transferError}
                    <div role="alert" data-variant="error">{form.transferError}</div>
                {/if}
            </div>
            <footer>
                <button type="button" commandfor="dialog-transferir" command="close" class="outline">Cancelar</button>
                <button>Transferir</button>
            </footer>
        </form>
    </dialog>

    <dialog id="dialog-recibo" bind:this={reciboDialog} closedby="any">
        {#if recibo}
            <header>
                <h3>Transferencia exitosa</h3>
                <p class="text-light">Comparte tu comprobante de pago.</p>
            </header>
            <output class="recibo">
                <span class="badge" data-variant="success">Comprobante de pago</span>
                <p class="recibo-monto">${recibo.monto.toFixed(2)}</p>
                <div>
                    <p class="recibo-fila"><span class="text-light">Para:</span> {recibo.cedulaDestino}</p>
                    <p class="recibo-fila"><span class="text-light">Concepto:</span> {recibo.descripcion}</p>
                    <p class="recibo-fila"><span class="text-light">Fecha:</span> {recibo.timestamp}</p>
                    <p class="recibo-fila"><span class="text-light">N°:</span> {recibo.id}</p>
                </div>
            </output>
            <footer>
                <button type="button" class="outline" onclick={() => reciboDialog.close()}>Cerrar</button>
                <button type="button" onclick={compartirRecibo}>Compartir comprobante</button>
            </footer>
        {/if}
    </dialog>
{:else}
    <main class="container login mt-8 mb-8">
        <article class="card" style="max-width: 420px;">
            <header>
                <h1>Iniciar sesión</h1>
                <p class="text-light">Ingresa tu cédula para ver tu información.</p>
            </header>
            <form method="POST" action="?/login" class="vstack" use:enhance>
                <label data-field>
                    Cédula
                    <input type="number" name="cedula" required>
                </label>
                <button>Entrar</button>
            </form>
            {#if form?.loginError}
                <div role="alert" data-variant="error" class="mt-4">{form.loginError}</div>
            {/if}
        </article>
    </main>
{/if}

<style>
    main.login {
        display: grid;
        place-items: center;
        min-height: 100dvh;
    }
    .virtual-card {
        position: relative;
        overflow: hidden;
        isolation: isolate;
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
        padding: var(--space-8);
        border-radius: var(--radius-large);
        border: 1px solid rgb(255 255 255 / 0.08);
        background:
            radial-gradient(120% 120% at 10% 0%, rgb(56 189 248 / 0.28), transparent 55%),
            radial-gradient(120% 120% at 100% 100%, rgb(168 85 247 / 0.30), transparent 55%),
            linear-gradient(135deg, #111827 0%, #1e293b 100%);
        color: #fff;
        animation: vc-glow 4s ease-in-out infinite alternate;
    }

    .virtual-card::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        background: linear-gradient(105deg, transparent 40%, rgb(255 255 255 / 0.10) 50%, transparent 60%);
        transform: translateX(-120%);
        animation: vc-shine 5.5s ease-in-out infinite;
        pointer-events: none;
    }

    .vc-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .vc-bank {
        font-weight: var(--font-semibold);
        letter-spacing: 0.04em;
    }

    .vc-badge {
        color: #fff;
        border-color: rgb(255 255 255 / 0.4);
    }

    .vc-chip {
        width: 48px;
        height: 36px;
        border-radius: var(--radius-medium);
        background: linear-gradient(135deg, #fbbf24, #d97706);
        box-shadow: inset 0 1px 1px rgb(255 255 255 / 0.4), 0 2px 6px rgb(0 0 0 / 0.35);
    }

    .vc-saldo {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .vc-monto {
        margin: 0;
        font-size: var(--text-1);
        font-weight: var(--font-bold);
        font-variant-numeric: tabular-nums;
    }

    .vc-label {
        margin: 0;
        font-size: var(--text-8);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgb(255 255 255 / 0.6);
    }

    .vc-bottom {
        display: flex;
        align-items: flex-end;
        gap: var(--space-8);
        flex-wrap: wrap;
    }

    .vc-value {
        margin: 0;
        font-weight: var(--font-semibold);
    }

    .vc-qr {
        width: 64px;
        height: 64px;
        border-radius: var(--radius-medium);
        background: #fff;
        padding: 4px;
    }

    @keyframes vc-shine {
        0%, 55% {
            transform: translateX(-120%);
        }
        100% {
            transform: translateX(120%);
        }
    }

    @keyframes vc-glow {
        from {
            box-shadow: 0 24px 48px -12px rgb(2 6 23 / 0.5);
        }
        to {
            box-shadow: 0 24px 56px -8px rgb(56 189 248 / 0.35);
        }
    }

    .recibo {
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
        padding: var(--space-8);
        border: 2px dashed var(--border);
        border-radius: var(--radius-medium);
        text-align: center;
    }

    .recibo-monto {
        margin: 0;
        font-size: var(--text-1);
        font-weight: var(--font-bold);
        font-variant-numeric: tabular-nums;
    }

    .recibo-fila {
        display: flex;
        justify-content: space-between;
        gap: var(--space-6);
        margin: var(--space-2) 0;
        font-size: var(--text-6);
        text-align: left;
        overflow-wrap: anywhere;
    }

    .hist-debito {
        background-color: color-mix(in srgb, var(--danger) 10%, transparent);
    }

    .hist-credito {
        background-color: color-mix(in srgb, var(--success) 10%, transparent);
    }

    .table .hist-debito:hover,
    .table .hist-credito:hover {
        background-color: color-mix(in srgb, var(--accent) 50%, transparent);
    }
</style>
