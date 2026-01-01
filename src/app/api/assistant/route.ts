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

        // 3. Sistema Prompt: Experto en Tienda (v3 - Humano y Directo)
        const systemPrompt = `Eres el asistente experto de la tienda "Full Mobile". No eres una IA técnica, eres un empleado que conoce su inventario y ayuda a los clientes.

REGLAS DE ORO:
- NUNCA uses tablas ni markdown complejo.
- Responde con ALIENTO HUMANO y frases cortas.
- Solo lista productos si te lo piden explícitamente.
- Resalta en **negrita** solo los datos clave: **modelo**, **stock** y **precio**.

BÚSQUEDA Y COMPATIBILIDAD INTELIGENTE:
1. Si te preguntan por un modelo (ej: "iPhone 12" o "A12"), busca en todo el texto del inventario.
2. Un modelo como "A02-A12-M12" es 100% compatible con "A12".
3. Si no hay exactamente el modelo base, busca VARIANTES (Pro, Max, etc.) y ofrécelas proactivamente.
4. PROHIBIDO decir "no tengo información" sin antes haber buscado relaciones o modelos similares de la misma marca que sí tengan stock.

EJEMPLO DE TONO:
"¡Hola! Para el Samsung A12 sí tenemos disponibilidad. Tenemos la pantalla compatible **A02-A12-M12** con **1 unidad** en stock por un precio de **47.000**. ¿Te gustaría saber si le sirve a otro modelo?"

REGLAS ABSOLUTAS:
- Eres de SOLO LECTURA. No inventes datos.
- Usa lenguaje profesional pero sencillo.

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
