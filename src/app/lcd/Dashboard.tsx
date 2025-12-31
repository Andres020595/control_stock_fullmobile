'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Search, Download, Plus, Save, ArrowLeft, Trash2, FileUp, X, Check, LogOut } from 'lucide-react';
import { ScreenData } from '@/lib/db';
import { updateScreens, addScreen } from '@/lib/actions';
import Link from 'next/link';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';

// Declaration for jspdf-autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export default function Dashboard({ initialData }: { initialData: ScreenData[] }) {
    const { logout, user } = useAuth();
    const [data, setData] = useState<ScreenData[]>(initialData);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState<ScreenData>({ Marca: '', Modelo_LCD: '', Precio: 0 });
    const [isSaving, setIsSaving] = useState(false);

    if (!user) return null;

    // Import states
    const [importPreview, setImportPreview] = useState<ScreenData[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const brands = useMemo(() => {
        return Array.from(new Set(data.map(item => item.Marca))).sort();
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = (item.Marca + ' ' + item.Modelo_LCD).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesBrand = !selectedBrand || item.Marca === selectedBrand;
            return matchesSearch && matchesBrand;
        });
    }, [data, searchTerm, selectedBrand]);

    const handlePriceChange = (index: number, value: string) => {
        const newData = [...data];
        newData[index].Precio = parseFloat(value) || 0;
        setData(newData);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await updateScreens(data);
        setIsSaving(false);
        alert('Precios actualizados con éxito');
    };

    const handleAddNew = async () => {
        if (!newItem.Marca || !newItem.Modelo_LCD) {
            alert('Por favor complete Marca y Modelo');
            return;
        }
        const newData = [...data, newItem];
        setData(newData);
        await addScreen(newItem);
        setIsAdding(false);
        setNewItem({ Marca: '', Modelo_LCD: '', Precio: 0 });
    };

    const processRows = (rows: any[]) => {
        try {
            const parsed = rows.map((row: any) => {
                let marca = '', modelo = '', precio = 0;

                // Strategy 1: Header names
                if (typeof row === 'object' && !Array.isArray(row)) {
                    marca = row.Marca || row.marca || row.MARCA || row.Brand || row.brand || '';
                    modelo = row.Modelo_LCD || row.modelo || row.Modelo || row.Model || row.model || '';
                    precio = row.Precio || row.precio || row.PRECIO || row.Price || row.price || 0;
                }

                // Strategy 2: Position Fallback
                if (!marca || !modelo) {
                    const values = Array.isArray(row) ? row : Object.values(row);
                    marca = values[0]?.toString() || '';
                    modelo = values[1]?.toString() || '';
                    precio = values[2] || 0;
                }

                let rawPrecio: any = precio;
                let finalPrecio = 0;
                if (typeof rawPrecio === 'string') {
                    finalPrecio = parseFloat(rawPrecio.replace(/[^0-9.]/g, '')) || 0;
                } else if (typeof rawPrecio === 'number') {
                    finalPrecio = rawPrecio;
                } else if (rawPrecio) {
                    finalPrecio = parseFloat(rawPrecio.toString()) || 0;
                }

                return {
                    Marca: marca.toString().toUpperCase().trim(),
                    Modelo_LCD: modelo.toString().toUpperCase().trim(),
                    Precio: finalPrecio
                };
            }).filter(item => item.Marca && item.Modelo_LCD && item.Marca !== 'MARCA' && item.Marca !== 'BRAND');

            if (parsed.length === 0) {
                alert('No se pudieron extraer datos. Compruebe que el archivo tenga 3 columnas: Marca, Modelo y Precio.');
                return;
            }

            setImportPreview(parsed as ScreenData[]);
        } catch (error: any) {
            console.error("Import processing error:", error);
            alert('Error al procesar el archivo. Es posible que el formato no sea compatible.');
        }
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => processRows(results.data),
                error: (error) => alert('Error CSV: ' + error.message)
            });
        } else if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    const rows = (data as any[]).slice(1);
                    processRows(rows);
                } catch (e) {
                    alert('Error al leer Excel: ' + (e instanceof Error ? e.message : 'Desconocido'));
                }
            };
            reader.readAsBinaryString(file);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const confirmImport = async () => {
        if (!importPreview) return;

        try {
            const existingKeys = new Set(data.map(d => `${d.Marca}-${d.Modelo_LCD}`));
            const newItems = importPreview.filter(item => !existingKeys.has(`${item.Marca}-${item.Modelo_LCD}`));

            const updatedData = [...data, ...newItems];
            setData(updatedData);
            await updateScreens(updatedData);

            alert(`Importación completada. Se añadieron ${newItems.length} modelos nuevos.`);
            setImportPreview(null);
        } catch (error) {
            console.error("Import confirmation error:", error);
            alert('Error al guardar la importación.');
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const logoImg = new Image();
        logoImg.src = '/Logo.png';

        const wmImg = new Image();
        wmImg.src = '/marca de agua.png';

        const brandsInView = Array.from(new Set(filteredData.map(i => i.Marca))).sort();

        const generatePage = (brand: string, brandItems: any[], startY: number) => {
            try {
                doc.addImage(logoImg, 'PNG', 14, 10, 30, 30);
            } catch (e) {
                console.error("Error drawing logo", e);
            }

            doc.setFontSize(24);
            doc.setTextColor(29, 29, 31);
            doc.text('Full Mobile', 50, 25);
            doc.setFontSize(12);
            doc.setTextColor(110, 110, 115);
            doc.text('Catálogo de Precios LCD', 50, 32);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 50, 38);

            doc.setFontSize(18);
            doc.setTextColor(0, 132, 255);
            doc.text(brand, 14, startY);

            (doc as any).autoTable({
                startY: startY + 5,
                head: [['Modelo', 'Precio (COP)']],
                body: brandItems.map(i => [i.Modelo_LCD, new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(i.Precio)]),
                margin: { left: 14, right: 14 },
                styles: { fontSize: 10, cellPadding: 4 },
                headStyles: { fillColor: [10, 132, 255] },
                alternateRowStyles: { fillColor: [245, 247, 252] },
                didDrawPage: (data: any) => {
                    const pWidth = doc.internal.pageSize.getWidth();
                    const pHeight = doc.internal.pageSize.getHeight();

                    doc.saveGraphicsState();
                    // Opacidad extremadamente sutil (5%)
                    doc.setGState(new (doc as any).GState({ opacity: 0.05 }));

                    // Dimensiones significativas para la marca de agua (ej: 140mm de ancho)
                    const wmWidth = 140;
                    const wmHeight = 140; // Asumimos cuadrada o similar, se puede ajustar
                    const x = (pWidth - wmWidth) / 2;
                    const y = (pHeight - wmHeight) / 2;

                    try {
                        doc.addImage(wmImg, 'PNG', x, y, wmWidth, wmHeight);
                    } catch (e) {
                        console.error("Error drawing watermark image", e);
                    }

                    doc.restoreGraphicsState();
                }
            });
        };

        let firstPage = true;
        brandsInView.forEach((brand) => {
            const brandItems = filteredData.filter(i => i.Marca === brand);
            if (!firstPage) {
                doc.addPage();
            }
            generatePage(brand, brandItems, 55);
            firstPage = false;
        });

        doc.save(`Catalogo_Full_Mobile_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Link href="/">
                        <div className="glass-card" style={{ padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <ArrowLeft size={24} />
                        </div>
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '2.5rem' }}>Gestión LCD</h1>
                        <p style={{ opacity: 0.7 }}>Actualice precios y gestione el catálogo</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileImport}
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="harmony-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#5856d6' }}>
                        <FileUp size={20} /> Importar Datos
                    </button>
                    <button onClick={handleExportPDF} className="harmony-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#34c759' }}>
                        <Download size={20} /> PDF
                    </button>
                    <button onClick={() => setIsAdding(true)} className="harmony-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> Nuevo
                    </button>
                    <button onClick={logout} className="harmony-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ff3b30' }}>
                        <LogOut size={20} /> Salir
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="harmony-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isSaving ? '#9ca3af' : 'var(--primary-gradient)' }}>
                        <Save size={20} /> {isSaving ? 'Guardando' : 'Guardar'}
                    </button>
                </div>
            </header>

            {/* Import Preview Modal */}
            {importPreview && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content animate-slide-in">
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2>Previsualización de Importación</h2>
                            <button onClick={() => setImportPreview(null)} className="icon-btn"><X /></button>
                        </header>
                        <p style={{ marginBottom: '20px', opacity: 0.7 }}>Se han detectado {importPreview.length} registros válidos. Revise los datos antes de confirmar.</p>

                        <div className="preview-table-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '12px' }}>Marca</th>
                                        <th style={{ padding: '12px' }}>Modelo</th>
                                        <th style={{ padding: '12px' }}>Precio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importPreview.slice(0, 100).map((item, i) => (
                                        <tr key={`${item.Marca}-${item.Modelo_LCD}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '12px' }}>{item.Marca}</td>
                                            <td style={{ padding: '12px' }}>{item.Modelo_LCD}</td>
                                            <td style={{ padding: '12px' }}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.Precio)}</td>
                                        </tr>
                                    ))}
                                    {importPreview.length > 100 && (
                                        <tr>
                                            <td colSpan={3} style={{ padding: '12px', textAlign: 'center', opacity: 0.5 }}>
                                                Y {importPreview.length - 100} registros más...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setImportPreview(null)} className="harmony-button" style={{ background: '#ff3b30' }}>Cancelar</button>
                            <button onClick={confirmImport} className="harmony-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Check size={20} /> Confirmar Añadir
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Buscador - Fila superior dedicada para máximo ancho */}
            <div style={{ marginBottom: '24px' }}>
                <div className="glass-card" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '0 24px',
                    minHeight: '60px',
                }}>
                    <Search size={22} color="var(--primary)" />
                    <input
                        type="text"
                        placeholder="Buscar por marca o modelo..."
                        style={{
                            border: 'none',
                            background: 'transparent',
                            width: '100%',
                            fontSize: '1.1rem',
                            color: '#ffffff',
                            fontWeight: '400',
                            padding: '12px 0',
                            outline: 'none'
                        }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Filtro de Marcas - Segunda fila */}
            <div style={{ marginBottom: '32px' }}>
                <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', gap: '12px', overflowX: 'auto' }}>
                    <button
                        onClick={() => setSelectedBrand(null)}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '24px',
                            border: 'none',
                            background: !selectedBrand ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: !selectedBrand ? 'white' : 'inherit',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Todos
                    </button>
                    {brands.map(brand => (
                        <button
                            key={brand}
                            onClick={() => setSelectedBrand(brand)}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '24px',
                                border: 'none',
                                background: selectedBrand === brand ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                color: selectedBrand === brand ? 'white' : 'inherit',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                fontWeight: '500'
                            }}
                        >
                            {brand}
                        </button>
                    ))}
                </div>
            </div>

            {isAdding && (
                <div className="glass-card animate-slide-in" style={{ padding: '24px', marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.6 }}>Marca</label>
                        <input
                            list="brands"
                            className="harmony-input"
                            style={{ width: '100%' }}
                            value={newItem.Marca}
                            onChange={(e) => setNewItem({ ...newItem, Marca: e.target.value.toUpperCase() })}
                        />
                        <datalist id="brands">
                            {brands.map(b => <option key={b} value={b} />)}
                        </datalist>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.6 }}>Modelo</label>
                        <input
                            type="text"
                            className="harmony-input"
                            style={{ width: '100%' }}
                            value={newItem.Modelo_LCD}
                            onChange={(e) => setNewItem({ ...newItem, Modelo_LCD: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.6 }}>Precio (COP)</label>
                        <input
                            type="number"
                            className="harmony-input"
                            style={{ width: '100%' }}
                            value={newItem.Precio === 0 ? '' : newItem.Precio}
                            onChange={(e) => setNewItem({ ...newItem, Precio: parseFloat(e.target.value) || 0 })}
                            placeholder="Ej: 25000"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleAddNew} className="harmony-button">Añadir</button>
                        <button onClick={() => setIsAdding(false)} className="harmony-button" style={{ background: '#ff3b30' }}>Cancelar</button>
                    </div>
                </div>
            )}

            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th style={{ padding: '20px' }}>Marca</th>
                            <th style={{ padding: '20px' }}>Modelo LCD</th>
                            <th style={{ padding: '20px' }}>Precio (COP)</th>
                            <th style={{ padding: '20px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item, idx) => {
                            const globalIdx = data.findIndex(d => d === item);
                            return (
                                <tr key={`${item.Marca}-${item.Modelo_LCD}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{item.Marca}</td>
                                    <td style={{ padding: '16px 20px' }}>{item.Modelo_LCD}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <input
                                            type="number"
                                            className="harmony-input"
                                            value={item.Precio}
                                            onChange={(e) => handlePriceChange(globalIdx, e.target.value)}
                                            style={{ border: 'none', background: 'rgba(255,255,255,0.05)', width: '150px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Está seguro de eliminar este modelo?')) {
                                                    const newData = data.filter((_, i) => i !== globalIdx);
                                                    setData(newData);
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
