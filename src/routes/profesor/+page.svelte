<script>
    import { enhance } from '$app/forms';
    import QrScanner from './QrScanner.svelte';

    let { data, form } = $props();

    let titulo = $derived(
        data.autenticado
            ? 'Panel del profesor · Banco Estudiantil'
            : 'Acceso del profesor · Banco Estudiantil'
    );

    let cedulaDetectada = $state('');
    let creditoDialog = $state(null);
    let creditoCedula = $state('');
    let creditoNombre = $state('');

    let editarDialog = $state(null);
    let editarEstudiante = $state(null);

    let eliminarDialog = $state(null);
    let eliminarCedula = $state('');
    let eliminarNombre = $state('');

    function alDetectar(cedula) {
        cedulaDetectada = cedula;
    }

    function reescanear() {
        cedulaDetectada = '';
    }

    function abrirCredito(est) {
        creditoCedula = String(est.cedula);
        creditoNombre = `${est.nombres} ${est.apellidos}`;
        creditoDialog?.showModal();
    }

    function abrirEditar(est) {
        editarEstudiante = { ...est };
        editarDialog?.showModal();
    }

    function abrirEliminar(est) {
        eliminarCedula = String(est.cedula);
        eliminarNombre = `${est.nombres} ${est.apellidos}`;
        eliminarDialog?.showModal();
    }

    function creditoEnhancer() {
        return async ({ result, update }) => {
            await update();

            if (result.type === 'success' && result.data?.creditoOk) {
                creditoDialog?.close();
                window.ot?.toast?.(`Puntos añadidos a ${creditoNombre}`, 'Listo', { variant: 'success' });
            }
        };
    }

    function editarEnhancer() {
        return async ({ result, update }) => {
            await update();

            if (result.type === 'success' && result.data?.editarOk) {
                editarDialog?.close();
                window.ot?.toast?.('Estudiante actualizado', 'Listo', { variant: 'success' });
            }
        };
    }

    function eliminarEnhancer() {
        return async ({ result, update }) => {
            await update();

            if (result.type === 'success' && result.data?.eliminarOk) {
                eliminarDialog?.close();
                window.ot?.toast?.('Estudiante eliminado', 'Listo', { variant: 'success' });
            }
        };
    }
</script>

<svelte:head>
    <title>{titulo}</title>
</svelte:head>

{#if !data.autenticado}
    <main class="container login mt-8 mb-8">
        <article class="card" style="max-width: 420px;">
            <header>
                <h1>Acceso del profesor</h1>
                <p class="text-light">Ingresa la contraseña para administrar el banco.</p>
            </header>
            <form method="POST" action="?/login" class="vstack" use:enhance>
                <label data-field>
                    Contraseña
                    <input type="password" name="password" required>
                </label>
                <button>Entrar</button>
            </form>
            {#if form?.loginError}
                <div role="alert" data-variant="error" class="mt-4">{form.loginError}</div>
            {/if}
        </article>
    </main>
{:else}
    <main class="container mt-8 mb-8">
        <header class="hstack justify-between">
            <div>
                <h1>Panel del profesor</h1>
                <p class="text-light">Gestiona los puntos de tus estudiantes.</p>
            </div>
            <div class="hstack">
                <button commandfor="dialog-registrar" command="show-modal">Registrar estudiante</button>
                <button commandfor="dialog-importar" command="show-modal" data-variant="secondary" class="outline">Importar estudiantes</button>
                <form method="POST" action="?/logout" use:enhance>
                    <button data-variant="secondary" class="outline">Cerrar sesión</button>
                </form>
            </div>
        </header>

        <article class="card mt-6">
            <h2>Debitar puntos</h2>
            <form method="POST" action="?/debit" class="vstack" use:enhance>
                <label data-field>
                    QR o cédula del estudiante
                    <input
                        type="text"
                        name="cedula"
                        bind:value={cedulaDetectada}
                        placeholder="Escanea el QR o pega la cédula"
                        required
                    >
                </label>
                <QrScanner ondetect={alDetectar} />
                {#if cedulaDetectada}
                    <button type="button" onclick={reescanear} data-variant="secondary" class="outline small">Escanear otro QR</button>
                {/if}
                <label data-field>
                    Monto
                    <input type="number" name="monto" step="0.01" min="0.01" required>
                </label>
                <button>Debitar</button>
            </form>
            {#if form?.debitError}
                <div role="alert" data-variant="error" class="mt-4">{form.debitError}</div>
            {/if}
            {#if form?.debitOk}
                <div role="alert" data-variant="success" class="mt-4">Débito realizado correctamente.</div>
            {/if}
        </article>

        <article class="card mt-6">
            <h2>Estudiantes</h2>
            <div class="table tabla-estudiantes">
                <table>
                    <thead>
                        <tr>
                            <th>Cédula</th>
                            <th>Nombres</th>
                            <th>Apellidos</th>
                            <th>Saldo</th>
                            <th>QR</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.estudiantes as est}
                            <tr>
                                <td data-label="Cédula">{est.cedula}</td>
                                <td data-label="Nombres">{est.nombres}</td>
                                <td data-label="Apellidos">{est.apellidos}</td>
                                <td data-label="Saldo"><span class="badge" data-variant={est.saldo > 0 ? 'success' : 'secondary'}>${est.saldo.toFixed(2)}</span></td>
                                <td data-label="QR"><img src={est.qrCode} alt="QR de {est.nombres} {est.apellidos}" width="80" /></td>
                                <td data-label="">
                                    <div class="hstack">
                                        <button type="button" class="small" onclick={() => abrirCredito(est)}>Añadir puntos</button>
                                        <button type="button" class="small" onclick={() => abrirEditar(est)}>Editar</button>
                                        <button type="button" class="small" onclick={() => abrirEliminar(est)}>Eliminar</button>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </article>
    </main>

    <dialog id="dialog-creditar" bind:this={creditoDialog} closedby="any">
        <form method="POST" action="?/credito" use:enhance={creditoEnhancer}>
            <header>
                <h3>Añadir puntos</h3>
                <p class="text-light">{creditoNombre}</p>
            </header>
            <div class="vstack">
                <input type="hidden" name="cedula" value={creditoCedula}>
                <label data-field>
                    Monto
                    <input type="number" name="monto" step="0.01" min="0.01" required>
                </label>
                <label data-field>
                    Descripción
                    <input type="text" name="descripcion" maxlength="200" placeholder="Participación, bonificación, premio...">
                </label>
                {#if form?.creditoError}
                    <div role="alert" data-variant="error">{form.creditoError}</div>
                {/if}
            </div>
            <footer>
                <button type="button" commandfor="dialog-creditar" command="close" class="outline">Cancelar</button>
                <button>Añadir puntos</button>
            </footer>
        </form>
    </dialog>

    <dialog id="dialog-editar" bind:this={editarDialog} closedby="any">
        <form method="POST" action="?/editar" use:enhance={editarEnhancer}>
            <header>
                <h3>Editar estudiante</h3>
                <p class="text-light">Modifica los datos del estudiante.</p>
            </header>
            <div class="vstack">
                <input type="hidden" name="cedulaOriginal" value={editarEstudiante?.cedula}>
                <label data-field>
                    Cédula
                    <input type="number" name="cedula" required value={editarEstudiante?.cedula}>
                </label>
                <label data-field>
                    Nombres
                    <input type="text" name="nombres" required value={editarEstudiante?.nombres}>
                </label>
                <label data-field>
                    Apellidos
                    <input type="text" name="apellidos" required value={editarEstudiante?.apellidos}>
                </label>
                <label data-field>
                    Saldo
                    <input type="number" name="saldo" step="0.01" min="0" value={editarEstudiante?.saldo}>
                </label>
                {#if form?.editarError}
                    <div role="alert" data-variant="error">{form.editarError}</div>
                {/if}
            </div>
            <footer>
                <button type="button" commandfor="dialog-editar" command="close" class="outline">Cancelar</button>
                <button>Guardar cambios</button>
            </footer>
        </form>
    </dialog>

    <dialog id="dialog-eliminar" bind:this={eliminarDialog} closedby="any">
        <form method="POST" action="?/eliminar" use:enhance={eliminarEnhancer}>
            <header>
                <h3>Eliminar estudiante</h3>
                <p>¿Estás seguro de que quieres eliminar a {eliminarNombre}?</p>
            </header>
            <input type="hidden" name="cedula" value={eliminarCedula}>
            <footer class="hstack">
                <button type="button" commandfor="dialog-eliminar" command="close" class="outline">Cancelar</button>
                <button data-variant="danger">Eliminar</button>
            </footer>
        </form>
    </dialog>

    <dialog id="dialog-registrar" closedby="any">
        <form method="POST" action="?/registrar" use:enhance>
            <header>
                <h3>Registrar estudiante</h3>
                <p class="text-light">Ingresa los datos del nuevo estudiante.</p>
            </header>
            <div class="vstack">
                <label data-field>
                    Cédula
                    <input type="number" name="cedula" required>
                </label>
                <label data-field>
                    Nombres
                    <input type="text" name="nombres" required>
                </label>
                <label data-field>
                    Apellidos
                    <input type="text" name="apellidos" required>
                </label>
                <label data-field>
                    Saldo inicial
                    <input type="number" name="saldo" step="0.01" min="0" value="0">
                </label>
                {#if form?.registrarError}
                    <div role="alert" data-variant="error">{form.registrarError}</div>
                {/if}
                {#if form?.registrarOk}
                    <div role="alert" data-variant="success">Estudiante registrado correctamente.</div>
                {/if}
            </div>
            <footer>
                <button type="button" commandfor="dialog-registrar" command="close" class="outline">Cancelar</button>
                <button>Registrar</button>
            </footer>
        </form>
    </dialog>

    <dialog id="dialog-importar" closedby="any">
        <form method="POST" action="?/importar" enctype="multipart/form-data" use:enhance>
            <header>
                <h3>Importar estudiantes</h3>
                <p class="text-light">Sube un archivo .xlsx o .csv con los estudiantes.</p>
            </header>
            <div class="vstack">
                <label data-field>
                    Archivo (.xlsx o .csv)
                    <input type="file" name="archivo" accept=".xlsx,.xls,.csv" required>
                </label>
                {#if form?.importError}
                    <div role="alert" data-variant="error">{form.importError}</div>
                {/if}
                {#if form?.importResult}
                    <div role="alert" data-variant="success" class="hstack">
                        <span class="badge" data-variant="success">Importados: {form.importResult.agregados}</span>
                        <span class="badge" data-variant="secondary">Duplicados: {form.importResult.duplicados}</span>
                        <span class="badge" data-variant="warning">Inválidos: {form.importResult.invalidos}</span>
                        <span class="badge">Filas: {form.importResult.total}</span>
                    </div>
                {/if}
            </div>
            <footer>
                <button type="button" commandfor="dialog-importar" command="close" class="outline">Cancelar</button>
                <button>Importar</button>
            </footer>
        </form>
    </dialog>
{/if}

<style>
    main.login {
        display: grid;
        place-items: center;
        min-height: 100dvh;
    }
    @media (max-width: 640px) {
        .tabla-estudiantes thead {
            display: none;
        }

        .tabla-estudiantes,
        .tabla-estudiantes tbody,
        .tabla-estudiantes tr,
        .tabla-estudiantes td {
            display: block;
            width: 100%;
        }

        .tabla-estudiantes {
            min-width: 0;
        }

        .tabla-estudiantes tbody tr {
            border: 1px solid var(--border);
            border-radius: var(--radius-medium);
            margin-bottom: var(--space-3);
            padding: var(--space-2) var(--space-3);
        }

        .tabla-estudiantes td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-4);
            padding: var(--space-2) 0;
            border: none;
        }

        .tabla-estudiantes td::before {
            content: attr(data-label);
            font-weight: var(--font-semibold);
            color: var(--muted-foreground);
        }

        .tabla-estudiantes td[data-label=""]::before {
            display: none;
        }

        .tabla-estudiantes td:last-child {
            display: block;
            border-top: 1px solid var(--border);
            margin-top: var(--space-2);
            padding-top: var(--space-3);
        }

        .tabla-estudiantes td:last-child button {
            width: 100%;
        }
    }
</style>
