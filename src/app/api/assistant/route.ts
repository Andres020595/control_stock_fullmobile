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

        // 3. Sistema Prompt Estricto
        const systemPrompt = `Eres un asistente interno de negocio para una tienda pequeña de reparación y venta de componentes móviles.

REGLAS ABSOLUTAS:
- SOLO puedes responder usando la información proporcionada en el contexto.
- NO inventes productos, precios, marcas ni stock.
- Si no tienes la información, responde claramente: 'No tengo datos suficientes para responder a eso'.
- NO sugieras acciones automáticas.
- NO modifiques datos.
- NO hagas suposiciones externas.
- Responde siempre de forma clara, breve y profesional.
- Usa euros (€) para los precios.
- Si el usuario pregunta por un modelo que no existe en el inventario, dilo explícitamente.

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
            temperature: 0, // Minimizar alucinaciones
        });

        const reply = response.choices[0].message.content;

        return NextResponse.json({ reply });
    } catch (error: any) {
        console.error('[Assistant API Error]:', error);
        return NextResponse.json({
            error: 'Hubo un error al procesar tu consulta con el asistente.',
            details: error.message
        }, { status: 500 });
    }
}
