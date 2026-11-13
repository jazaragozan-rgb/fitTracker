# Desplegar el servicio de AI Coach

Este Worker conecta la sección **Progreso** con Workers AI. La clave o token de Cloudflare no se expone al navegador.

## Requisitos

- Una cuenta de Cloudflare en el plan gratuito.
- Node.js y npm para ejecutar Wrangler.
- La app publicada en Firebase Hosting.

El modelo es `@cf/meta/llama-4-scout-17b-16e-instruct`. No hay un límite diario por usuario en la aplicación. Workers AI puede aplicar límites de uso según el plan de Cloudflare; cualquier cuota disponible es compartida por la cuenta. Enviar el detalle de sesiones consume más cuota que enviar solo métricas agregadas. Si Cloudflare agota o limita la cuota, las estadísticas seguirán visibles, pero el coach puede dejar de responder hasta que se restablezca.

## Configuración y despliegue

Desde la raíz del repositorio, entra en la carpeta del Worker:

```sh
cd cloudflare/ai-coach
```

Después:

1. Inicia sesión en Cloudflare:

   ```sh
   npx wrangler login
   ```

2. Publica el Worker:

   ```sh
   npx wrangler deploy
   ```

3. Si Firebase Hosting usa un dominio personalizado o pruebas la app desde un preview de Codespaces, añade su origen a `ALLOWED_ORIGINS` en `wrangler.jsonc` (separado por comas, sin rutas ni barras finales) y vuelve a desplegar el Worker. Los dominios predeterminados de Firebase ya están permitidos.

4. Copia la URL `workers.dev` que Wrangler muestra al desplegar y colócala en `modules/seguimiento/ai-coach-config.js`, seguida de `/api/coach`. Por ejemplo:

   ```js
   export const AI_COACH_API_URL = 'https://fittracker-ai-coach.TU-SUBDOMINIO.workers.dev/api/coach';
   ```

5. Publica de nuevo la app:

   ```sh
   cd ../..
   firebase deploy --only hosting
   ```

## Privacidad y protección

- El endpoint exige un token de Firebase Auth y verifica su firma y proyecto antes de procesar la solicitud.
- El navegador envía métricas agregadas y un resumen de cada sesión fechada de los últimos 56 días, incluyendo ejercicios, series prescritas/completadas, repeticiones, cargas y RIR. No envía sesiones fuera de ese periodo ni mediciones corporales.
- No se conserva un contador de consultas por usuario en el Worker.
- El prompt del modelo se construye en el Worker con un esquema limitado; no se acepta texto de prompt libre desde el navegador.
- El Worker calcula de nuevo la dirección y el porcentaje de las comparaciones antes de generar el consejo. El modelo recibe reglas para no recomendar aumentos de carga cuando caen la asistencia, las series completadas o el volumen, ni subir varias variables a la vez.
- Comprueba el uso de Workers AI en el dashboard de Cloudflare. La cuota gratuita es global para la cuenta y sus límites pueden cambiar.
