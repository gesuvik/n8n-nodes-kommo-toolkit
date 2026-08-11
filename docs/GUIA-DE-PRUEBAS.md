# Guía rápida de pruebas — Kommo Toolkit 0.2.0

## Antes de instalar

- Usá una instancia de n8n de pruebas y, de ser posible, una cuenta sandbox/trial de Kommo.
- Exportá los workflows importantes y respaldá la base de datos de n8n.
- No instales simultáneamente el paquete upstream y este toolkit. Ambos exponen los mismos tipos de
  credenciales de Kommo.
- El paquete usa el prefijo propio `n8n-nodes-kommo-toolkit`; no reemplaza automáticamente el tipo
  `n8n-nodes-kommo.*` dentro de workflows existentes.
- Las pruebas automáticas usan respuestas HTTP simuladas: no se ejecutaron escrituras reales en tu
  cuenta Kommo.

## Instalar desde npm

1. Abrí **Settings > Community Nodes** en la instancia self-hosted.
2. Elegí **Install**.
3. Pegá `n8n-nodes-kommo-toolkit`.
4. Aceptá la advertencia de código comunitario no verificado y confirmá la instalación.

Si el paquete aún no fue publicado, el mantenedor debe publicar primero el tarball validado con
`npm publish <archivo.tgz> --access public`.

## Validar el código y generar el paquete localmente

Desde la carpeta del proyecto:

```bash
pnpm install
pnpm lint
pnpm test
pnpm pack
```

El último comando crea un archivo `.tgz` instalable o publicable.

## Smoke test recomendado

1. **Credencial**: ejecutá `Kommo > Account > Get Info` con OAuth2 y/o token de larga duración.
2. **Lecturas nativas**: probá `Pipeline > Get Many`, `Pipeline Stage > Get Many`, `User > Get Many`
   y `Event > Get Types`.
3. **Webhook**: creá un workflow con `Kommo Trigger`, seleccioná `Lead Added` y `Lead Status
Changed`, activalo y verificá que Kommo registre la URL de producción. Generá un lead de prueba y
   confirmá la salida del trigger. Al desactivar el workflow, verificá que la suscripción desaparezca.
4. **Lotes**: mandá 51 leads ficticios a `Kommo Bulk` en una cuenta sandbox. Deben producirse dos
   requests internos, de 50 y 1 elemento, y 51 salidas enlazadas con sus entradas.
5. **API avanzada**: probá `Kommo API` con método GET, endpoint `account`, Query JSON `{}`. Luego
   probá `leads` con Embedded Collection Key `leads`.
6. **Recursos nuevos**: hacé una lectura antes de probar altas o cambios. Para borrar webhooks,
   fuentes, campos, pipelines o etapas, usá exclusivamente datos creados para el test.

## Qué observar

- No debería aparecer salida anidada como `$json.json`.
- Al usar varias entradas, cada salida debería mantener su `pairedItem` correcto.
- `Continue On Fail` debe conservar el item fallido y adjuntar el error.
- Una URL completa o un endpoint con `..`, `?`, `#` o `\\` debe ser rechazado por `Kommo API` antes
  de realizar la llamada.
- El trigger necesita permisos administrativos en Kommo y una URL HTTPS accesible públicamente.

## Alcance de esta versión

Esta versión amplía funcionalidad, no el techo de tráfico. Se mantiene el planificador conservador
de una solicitud cada 150 ms por proceso. El control distribuido, los reintentos por `429/5xx`, la
idempotencia y las pruebas de carga corresponden a la siguiente fase de escalamiento.
