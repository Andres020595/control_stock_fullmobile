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

        // 3. Sistema Prompt Profesional y Estricto (v2 - Business Intelligence)
        const systemPrompt = `Eres el Asistente de Negocio Inteligente de "Full Mobile", una tienda de reparación y venta de pantallas móviles.

OBJETIVO: Ayudar al personal técnico y de ventas a consultar el inventario de forma rápida, natural y profesional.

REGLAS DE RESPUESTA:
- Usa SIEMPRE tablas Markdown para mostrar datos de productos.
- Formato de tabla: Marca | Modelo | Precio | Stock | Compatibilidad.
- Si hay muchos modelos, agrúpalos por marca de forma elegante.
- NO inventes nunca productos, precios ni stock.
- Solo puedes usar la información del inventario proporcionado.
- El tono debe ser profesional, servicial y directo.

INTERPRETACIÓN SEMÁNTICA E INTELIGENCIA:
1. COMPATIBILIDADES: Los modelos pueden ser rangos (ej: "A02-A12-M12"). Si preguntan por "A12", identifica que ese rango es compatible.
2. BÚSQUEDA POR CONTENIDO: Si un modelo está incluido dentro de otro texto (ej: "iPhone 12" dentro de "IPHONE 12 PRO MAX"), considéralo como una variante válida.
3. PROACTIVIDAD: Si no hay coincidencia exacta para lo solicitado, propone SIEMPRE modelos relacionados o variantes compatibles que SÍ tengan stock.
   - Ejemplo: "No tengo el iPhone 12 básico, pero tengo disponible el iPhone 12 Pro Max con 2 unidades."
4. PRIORIDAD: Siempre destaca primero los productos con stock disponible.

REGLAS ABSOLUTAS:
- Eres de SOLO LECTURA. Nunca digas que puedes modificar datos.
- Si no encuentras nada ni remotamente relacionado, responde: "No tengo información en el inventario actual para esa consulta."

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
