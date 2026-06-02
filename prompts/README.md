# Prompts y generación de contenido SEO

Esta carpeta contiene el prompt editorial/SEO usado para generar el contenido
de las páginas de producto, y la documentación de cómo ejecutarlo.

## Archivos

- `producto-seo.md` — prompt principal. Define el rol, las reglas duras, el
  esquema JSON exacto y un one-shot. **Editar este archivo cambia el
  comportamiento del generador** (el script lo lee en cada corrida).
- `README.md` — este archivo.

## Cómo generar el contenido

### 1. Configurar la API key

Copia `.env.example` a `.env.local` en la raíz del proyecto y completa tu
API key:

```bash
cp .env.example .env.local
```

```dotenv
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1   # o OpenRouter, Groq, etc.
LLM_MODEL=gpt-4o-mini                   # o el que prefieras
```

El script funciona con **cualquier API compatible con OpenAI**:

| Proveedor   | `LLM_BASE_URL`                  | Notas                                  |
|-------------|----------------------------------|----------------------------------------|
| OpenAI      | `https://api.openai.com/v1`      | Default. `gpt-4o-mini` recomendado.    |
| OpenRouter  | `https://openrouter.ai/api/v1`   | Acceso a muchos modelos con una sola key. |
| Groq        | `https://api.groq.com/openai/v1` | Muy rápido, modelos OSS.               |
| Together    | `https://api.together.xyz/v1`    | Modelos OSS.                           |

### 2. Probar en seco (sin gastar API)

```bash
npm run seo:generate:dry
```

Imprime el system prompt y el user message del primer producto, sin hacer
ninguna llamada. Útil para verificar que el payload luce bien.

### 3. Generar un producto de prueba

```bash
npm run seo:generate -- --slug=eternal-roses
```

(o cualquier slug existente). Crea `data/seo/eternal-roses.json` si no
existía.

### 4. Generar todos los faltantes

```bash
npm run seo:generate
```

- Itera sobre los productos con `visible === true && stock > 0`.
- **Salta los JSONs que ya existen** (idempotente / resumible).
- Pool de 4 workers en paralelo.
- 3 reintentos con backoff exponencial por producto.
- Errores se loguean en `data/seo/errors.log`.

### 5. Regenerar todo desde cero

```bash
npm run seo:generate:force
```

⚠️ Sobrescribe todos los `data/seo/*.json`. Usar con cuidado (costo).

### Flags útiles

| Flag                     | Efecto                                        |
|--------------------------|-----------------------------------------------|
| `--force`                | Regenera incluso los que ya existen.          |
| `--slug=<slug>`          | Solo un producto.                             |
| `--limit=<n>`            | Solo los primeros N.                          |
| `--concurrency=<n>`      | Workers paralelos (default 4).                |
| `--model=<modelo>`       | Sobrescribe `LLM_MODEL`.                      |
| `--dry-run`              | No llama a la API.                            |

## Costo estimado

Con `gpt-4o-mini` ($0.15/1M input, $0.60/1M output):

- Por producto: ~$0.001–0.002 USD.
- 702 productos: **~$1–2 USD total**.

Modelos más caros (gpt-4o, claude-3.5-sonnet): ~10–20× más.

## Esquema de salida

El script escribe `data/seo/<slug>.json` con este esquema (ver
`producto-seo.md` para los detalles):

```ts
{
  slug, metaTitle, metaDescription,
  intro,           // 2 párrafos, keyword en el primero
  highlights,      // 3-5 beneficios cortos
  paraQuien,       // 1 frase, 20-40 palabras
  ocasiones,       // 3-6 ocasiones
  incluyeDetallado,// [{item, detalle}] copiando el contenido
  cuidados,        // [] si no aplica
  mensajesTarjeta, // 3 ejemplos
  faqs,            // 4-6 preguntas/respuestas → FAQPage JSON-LD
  keywordsObjetivo,// uso interno
}
```

## Cómo se consume

`app/producto/[slug]/page.tsx` carga el JSON correspondiente y:

- Reemplaza `metaTitle` y `metaDescription` (con fallback al catálogo).
- Usa el primer párrafo de `intro` como teaser en la columna de info.
- Renderiza `intro` completa, `highlights`, `paraQuien`, `ocasiones`,
  `cuidados`, `mensajesTarjeta` y `faqs` en una sección editorial abajo.
- Inyecta un bloque `FAQPage` en JSON-LD cuando hay FAQs (GEO/AEO).

Si el JSON no existe, la página usa el comportamiento anterior (descripcion
del catálogo + lista de "qué incluye"). El rollout es progresivo.
