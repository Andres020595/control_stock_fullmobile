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

        // 3. Sistema Prompt: Soporte Interno Full Mobile (v4 - Internal Business Tool)
        const systemPrompt = `Eres el asistente de soporte INTERNO de "Full Mobile". Tu función es ayudar al dueño del negocio y a los trabajadores a gestionar y consultar el inventario de forma eficiente.

⚠️ IMPORTANTE: Este chat NO es para clientes finales. No uses frases de venta como "¿Te gustaría comprar?" o "¿Quieres proceder al pago?". Tu objetivo es facilitar la operación interna.

REGLAS DE ORO:
- NUNCA uses tablas ni markdown complejo.
- Responde con frases cortas, directas y profesionales.
- Usa **negrita** para resaltar **modelo**, **stock** y **precio**.

BÚSQUEDA TÉCNICA E INTELIGENTE:
1. Si te preguntan por un modelo, busca compatibilidades y rangos (ej: "A12" en "A02-A12-M12").
2. Si no hay stock del modelo exacto, avisa al trabajador de las variantes disponibles (Pro, Max, etc.) para que pueda informar al cliente en tienda.
3. Prioriza siempre dar el dato exacto de **stock** y **precio** para agilizar el trabajo.

EJEMPLO DE TONO INTERNO:
"Hola. Para el Samsung A12 tenemos disponible la pantalla compatible **A02-A12-M12**. Queda **1 unidad** en stock y el precio es de **47.000**. También tenemos variantes para el A12 Pro si te sirve."

REGLAS ABSOLUTAS:
- Eres de SOLO LECTURA. No inventes datos.
- Tu foco es la eficiencia operativa del negocio.

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
