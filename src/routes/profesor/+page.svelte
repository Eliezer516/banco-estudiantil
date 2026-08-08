<script>
    import { enhance } from '$app/forms';
    import QrScanner from './QrScanner.svelte';

    let { data, form } = $props();

    let cedulaDetectada = $state('');
    let scanKey = $state(0);

    function alDetectar(cedula) {
        cedulaDetectada = cedula;
    }

    function reescanear() {
        cedulaDetectada = '';
        scanKey += 1;
    }
</script>

{#if !data.autenticado}
    <main class="container mt-8 mb-8">
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
                {#key scanKey}
                    <QrScanner ondetect={alDetectar} />
                {/key}
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
            <div class="table">
                <table>
                    <thead>
                        <tr>
                            <th>Cédula</th>
                            <th>Nombres</th>
                            <th>Apellidos</th>
                            <th>Saldo</th>
                            <th>QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.estudiantes as est}
                            <tr>
                                <td>{est.cedula}</td>
                                <td>{est.nombres}</td>
                                <td>{est.apellidos}</td>
                                <td><span class="badge" data-variant={est.saldo > 0 ? 'success' : 'secondary'}>${est.saldo.toFixed(2)}</span></td>
                                <td><img src={est.qrCode} alt="QR de {est.nombres} {est.apellidos}" width="80" /></td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </article>
    </main>

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
