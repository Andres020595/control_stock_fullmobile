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

        // 3. Sistema Prompt Estricto (Refinado para Compatibilidades y Formato)
        const systemPrompt = `Eres un asistente de inventario profesional para un negocio de reparación de móviles llamado "Full Mobile".

REGLAS DE RESPUESTA:
- Cuando la respuesta contenga listados, usa SIEMPRE Markdown.
- Si hay datos tabulares (productos, modelos, precios, stock), responde con una TABLA Markdown.
- No escribas listas largas en texto plano.
- No inventes datos que no estén en el inventario.
- Si no hay resultados, indícalo claramente.

REGLAS DE INTERPRETACIÓN DE MODELOS:
1. Los modelos pueden representar COMPATIBILIDADES (ej: "A02-A12-M12"). Si el usuario pregunta por "A12", es válido.
2. BÚSQUEDA INTELIGENTE: Si el usuario pregunta por un modelo base (ej: "iPhone 12"), busca TODAS las variantes que contengan ese número (ej: "12 Pro", "12 Pro Max", "12 Mini").
3. Si no hay coincidencia exacta para "iPhone 12", pero tienes "iPhone 12 Pro Max", responde: "No tengo el modelo base exacto, pero tengo disponible el iPhone 12 Pro Max que podría interesarte".
4. Busca coincidencias exactas y parciales. Trata "-", "/", "," como separadores de modelos compatibles.
5. Si hay coincidencia parcial, explícala brevemente.

REGLAS ABSOLUTAS:
- SOLO LECTURA. No inventes stock ni modelos.
- No modifiques datos ni sugieras cambios.
- Responde de forma clara y profesional.

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
