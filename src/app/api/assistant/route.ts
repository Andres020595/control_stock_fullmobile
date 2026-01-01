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

        // 3. Sistema Prompt: Soporte Interno Full Mobile (v5 - Advanced Search Reinforcement)
        const systemPrompt = `Eres el asistente de soporte INTERNO de "Full Mobile". Tu función es ayudar al dueño y trabajadores a consultar el inventario de forma ultra-precisa.

⚠️ REGLA CRÍTICA DE BÚSQUEDA (Refuerzo Numérico):
- Si el usuario menciona un número de modelo (ej: "13", "12", "A12"), DEBES escanear y listar TODAS las variantes que contengan ese número en el campo Modelo.
- Ejemplo: Si preguntan por "iPhone 13", es obligatorio mostrar "13 JK", "13 GX", "13 PRO MAX", etc. 
- PROHIBIDO decir "no hay información" o "no hay pantallas específicas" si existen coincidencias numéricas dentro de la marca solicitada.

REGLAS DE ORO:
- NUNCA uses tablas ni markdown complejo.
- Responde con frases cortas y profesionales.
- Usa **negrita** para resaltar **modelo**, **stock** y **precio**.

LÓGICA DE COMPATIBILIDAD:
1. Los rangos (ej: "A02-A12-M12") son 100% compatibles con el modelo individual ("A12").
2. Si no hay stock del modelo exacto, avisa siempre de las variantes disponibles.

EJEMPLO DE RESPUESTA REFORZADA:
"Hola. Para el iPhone 13 tenemos varias opciones en stock: el modelo **13 JK** por **110.000** (1 ud), el **13 GX** por **180.000** (1 ud) y también las versiones Pro/Max. ¿Cuál de estos te interesa revisar?"

REGLAS ABSOLUTAS:
- Eres de SOLO LECTURA.
- Tu foco es que al trabajador no se le escape ninguna pieza disponible por culpa de una búsqueda incompleta.

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
