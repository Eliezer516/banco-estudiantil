<script>
    import { onMount } from 'svelte';

    let { ondetect } = $props();

    let scanner = null;
    let errorEscaneo = $state(null);

    function extraerCedulaDelQr(texto) {
        const t = String(texto ?? '').trim();
        if (!t) return NaN;

        const match = t.match(/(?:^|[?&]data=)(\d+)/);
        if (match) return Number(match[1]);

        const numero = Number(t);
        return Number.isNaN(numero) ? NaN : numero;
    }

    onMount(() => {
        let detenido = false;

        (async () => {
            try {
                const { Html5QrcodeScanner } = await import('html5-qrcode');
                if (detenido) return;

                scanner = new Html5QrcodeScanner(
                    'reader',
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
                );

                await scanner.render(
                    (decodedText) => {
                        const cedula = extraerCedulaDelQr(decodedText);
                        if (!Number.isNaN(cedula)) {
                            ondetect(String(cedula));
                            detenerEscaneo();
                        }
                    },
                    (errorMessage) => console.warn(errorMessage)
                );
            } catch (e) {
                errorEscaneo = 'No se pudo iniciar el escáner: ' + (e?.message ?? e);
            }
        })();

        return () => {
            detenido = true;
            detenerEscaneo();
        };
    });

    function detenerEscaneo() {
        if (scanner) {
            try {
                scanner.clear();
            } catch (e) {}
            scanner = null;
        }
    }
</script>

<div id="reader" style="width: 100%; max-width: 400px; margin: 1rem 0;"></div>
{#if errorEscaneo}
    <p>{errorEscaneo}</p>
{/if}
