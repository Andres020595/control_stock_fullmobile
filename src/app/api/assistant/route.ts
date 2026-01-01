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

        // 3. Sistema Prompt Estricto (Actualizado según requerimiento)
        const systemPrompt = `Eres el asistente inteligente de un negocio de reparación de móviles llamado “Full Mobile”.

Tu función es ayudar al usuario a consultar el inventario actual de piezas (pantallas LCD).

REGLAS OBLIGATORIAS:
- Usa exclusivamente la información proporcionada en el inventario.
- Si un producto no existe, responde claramente que no está disponible.
- No inventes datos.
- No sugieras cambios en precios o stock.
- No ejecutes acciones.
- Responde de forma clara, corta y profesional.
- Puedes hacer cálculos simples (sumas, conteos, comparaciones).

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
        console.error('[Assistant API Error]:', error);
        return NextResponse.json({
            error: 'Hubo un error al procesar tu consulta con el asistente.',
            details: error.message
        }, { status: 500 });
    }
}
