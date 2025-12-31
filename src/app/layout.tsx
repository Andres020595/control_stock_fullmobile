import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Control de Piezas - Pantallas',
    description: 'Gestión moderna de precios para pantallas de móviles',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <body>
                <div className="harmony-bg" />
                {children}
            </body>
        </html>
    )
}
