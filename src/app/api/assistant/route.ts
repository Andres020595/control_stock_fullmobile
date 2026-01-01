import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getProductsFromSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'La API Key de OpenAI no está configurada.' }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });

        const { messages } = await req.json();

        // 1. Obtener datos actuales de Google Sheets
        const rawProducts = await getProductsFromSheet();

        // 2. Filtrar contexto para seguridad y ahorro de tokens
        const contextualInventory = rawProducts.map(p => ({
            Marca: p.Marca,
            Modelo: p.Modelo_LCD,
            Precio: p.Precio,
            Stock: p.Stock
        }));

        // 3. Sistema Prompt Profesional y Estricto
        const systemPrompt = `Eres un asistente de inventario profesional para un negocio de reparación de móviles llamado "Full Mobile".

REGLAS DE RESPUESTA:
- Usa SIEMPRE tablas Markdown para listados de productos.
- Columnas obligatorias: Marca | Modelo | Precio | Stock | Compatibilidad.
- No escribas listas largas en texto plano.
- No inventes datos que no estén en el inventario.
- Si no hay resultados, indícalo claramente.
- Prioriza siempre los productos que tengan Stock > 0.

REGLAS DE INTERPRETACIÓN Y COMPATIBILIDAD:
1. Los modelos pueden ser COMPATIBILIDADES o RANGOS (ej: "A02-A12-M12").
2. Si un usuario pregunta por un modelo (ej: "A12" o "iPhone 12"), busca coincidencias exactas y PARCIALES dentro de los rangos.
3. Los separadores "-", "/", "," indican listas de modelos compatibles. El modelo "12-12 PRO" es 100% una pantalla para "IPHONE 12".
4. Si no hay el modelo base exacto, ofrece siempre variantes compatibles (Pro, Max, etc.) que estén en el inventario.

REGLAS ABSOLUTAS:
- SOLO LECTURA. No modifiques nada.
- Responde de forma clara, profesional y útil para un técnico o vendedor.

CONTEXTO DISPONIBLE (Inventario Actual):
${JSON.stringify(contextualInventory, null, 2)}`;

        // 4. Llamada a OpenAI (gpt-4o-mini)
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            max_tokens: 500,
            temperature: 0,
        });

        const answer = response.choices[0].message.content;

        return NextResponse.json({ answer });
    } catch (error: any) {
        console.error('[Assistant API Error Details]:', error);
        return NextResponse.json({
            error: 'Hubo un error al procesar tu consulta con el asistente.',
            details: error.message
        }, { status: 500 });
    }
}
