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

        // 3. Sistema Prompt Estricto (Refinado para Compatibilidades)
        const systemPrompt = `Eres un asistente de inventario para un negocio de reparación de móviles llamado "Full Mobile".

Tienes acceso SOLO DE LECTURA a un listado de productos.

REGLAS IMPORTANTES DE INTERPRETACIÓN:

1. Los modelos pueden representar COMPATIBILIDADES.
   Ejemplo: "A02-A12-M12" significa que la pantalla es compatible con A02, A12 y M12.
   Si el usuario pregunta por "A12", debes considerar ese modelo como válido.

2. Cuando un usuario mencione un modelo:
   - Busca coincidencias exactas.
   - Si no hay coincidencia exacta, busca coincidencias parciales dentro del campo Modelo.
   - Trata los separadores "-", "/", "," como listas de modelos compatibles.

3. Si encuentras una coincidencia parcial relevante:
   - Responde afirmativamente.
   - Explica brevemente la compatibilidad.
   Ejemplo: "Sí, tenemos una pantalla compatible con Samsung A12. Aparece como A02-A12-M12 y hay 1 unidad en stock."

4. Si NO hay ninguna coincidencia:
   - Indícalo claramente.
   - NO inventes productos ni compatibilidades.

5. REGLAS ABSOLUTAS:
   - NO inventes stock ni modelos.
   - NO modifiques datos ni sugieras cambios.
   - Responde de forma clara, corta y profesional.
   - Usa la información proporcionada a continuación.

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
