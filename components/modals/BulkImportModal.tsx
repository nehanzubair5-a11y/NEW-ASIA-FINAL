import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Product, ProductVariant } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import { UploadCloudIcon, FileTextIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, DownloadIcon } from '../icons/Icons.tsx';
import Spinner from '../shared/Spinner.tsx';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';
type ParsedError = { row: number; message: string };
type ParsedProduct = Omit<Product, '_id' | 'priceHistory'>;

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, showToast }) => {
    const { addOrUpdateProductsBulk } = useData();

    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
    const [errors, setErrors] = useState<ParsedError[]>([]);
    const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
    const [importSummary, setImportSummary] = useState({ created: 0, updated: 0 });

    const resetState = () => {
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setImportStatus('idle');
        setImportSummary({ created: 0, updated: 0 });
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const parseCsv = (csvText: string): { products: ParsedProduct[], errors: ParsedError[] } => {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            return { products: [], errors: [{ row: 1, message: "CSV is empty or has only a header." }] };
        }
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['brand', 'modelname', 'variantname', 'color', 'sku', 'price'];
        const missingHeaders = requiredHeaders.filter(h => !header.includes(h));

        if (missingHeaders.length > 0) {
            return { products: [], errors: [{ row: 1, message: `Missing required headers: ${missingHeaders.join(', ')}` }] };
        }

        const productsMap = new Map<string, ParsedProduct>();
        const localErrors: ParsedError[] = [];
        const seenSkus = new Set<string>(); // Track SKUs within the file

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const rowData: any = {};
            header.forEach((h, index) => {
                rowData[h] = values[index]?.trim();
            });

            // --- Enhanced Validation ---
            const requiredFields: Record<string, string> = {
                brand: 'brand',
                modelname: 'modelName',
                variantname: 'variantName',
                color: 'color',
                sku: 'sku',
                price: 'price',
            };
            const missingFields: string[] = [];
            for (const key in requiredFields) {
                if (!rowData[key]) {
                    missingFields.push(requiredFields[key]);
                }
            }

            if (missingFields.length > 0) {
                localErrors.push({ row: i + 1, message: `Missing required field(s): ${missingFields.join(', ')}.` });
                continue;
            }
            // --- End Enhanced Validation ---

            const { brand, modelname: modelName, variantname: variantName, color, sku, price, engine, mileage } = rowData;
            
            if (seenSkus.has(sku.toLowerCase())) {
                localErrors.push({ row: i + 1, message: `Duplicate SKU "${sku}" found in file. SKUs must be unique.` });
                continue;
            }
            seenSkus.add(sku.toLowerCase());

            const productKey = `${brand.toLowerCase()}-${modelName.toLowerCase()}`;
            
            const newVariant: ProductVariant = { _id: `temp-csv-${i}`, name: variantName, color, sku, price: parseFloat(price) };
            
            if (isNaN(newVariant.price)) {
                 localErrors.push({ row: i + 1, message: `Invalid price format: "${price}"` });
                continue;
            }

            if (productsMap.has(productKey)) {
                const existingProduct = productsMap.get(productKey)!;
                existingProduct.variants.push(newVariant);
            } else {
                productsMap.set(productKey, {
                    brand, modelName,
                    variants: [newVariant],
                    specifications: { engine: engine || '', mileage: mileage || '' }
                });
            }
        }

        return { products: Array.from(productsMap.values()), errors: localErrors };
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setImportStatus('parsing');
            const uploadedFile = acceptedFiles[0];
            setFile(uploadedFile);

            const reader = new FileReader();
            reader.onload = () => {
                const { products, errors: parseErrors } = parseCsv(reader.result as string);
                setParsedData(products);
                setErrors(parseErrors);
                setImportStatus('preview');
            };
            reader.readAsText(uploadedFile);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        maxFiles: 1
    } as any);

    const handleImport = async () => {
        setImportStatus('importing');
        try {
            const summary = await addOrUpdateProductsBulk(parsedData);
            setImportSummary(summary);
            setImportStatus('complete');
        } catch (error) {
            showToast("An error occurred during import.", "error");
            setImportStatus('preview');
        }
    };

    const downloadTemplate = () => {
        const csvTemplate = "brand,modelName,variantName,color,sku,price,engine,mileage\nNew Asia,Bike,NA-70cc,Blue,NA-B70-BL,115000,70cc,55 km/l\nNew Asia,Bike,NA-125cc,Blue,NA-B125-BL,190000,125cc,45 km/l\nRamza,Scooty,Standard,Red,RMZ-S-R,160000,100cc,45 km/l";
        const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "product_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderContent = () => {
        switch (importStatus) {
            case 'idle': return (
                <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-red-50' : 'border-slate-300 hover:border-primary'}`}>
                    <input {...getInputProps()} />
                    <UploadCloudIcon className="w-12 h-12 mx-auto text-slate-400" />
                    <p className="mt-2 font-semibold text-slate-700">Drag & drop your CSV file here</p>
                    <p className="text-sm text-slate-500">or click to select a file</p>
                </div>
            );
            case 'parsing': return <div className="p-10 text-center"><Spinner className="w-10 h-10 mx-auto text-primary" /><p className="mt-2">Parsing file...</p></div>;
            case 'importing': return <div className="p-10 text-center"><Spinner className="w-10 h-10 mx-auto text-primary" /><p className="mt-2">Importing products...</p></div>;
            case 'preview': return (
                <div>
                    <h4 className="font-semibold text-slate-800">Import Preview</h4>
                    <p className="text-sm text-slate-500 mb-2">Review the data to be imported. Existing products will be updated with new variants or changes to existing ones.</p>
                    {errors.length > 0 && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <div className="flex items-center"><AlertTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" /><h5 className="font-bold text-yellow-800">{errors.length} rows have issues</h5></div>
                            <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 max-h-24 overflow-y-auto">
                                {errors.map(err => <li key={err.row}>Row {err.row}: {err.message}</li>)}
                            </ul>
                        </div>
                    )}
                     <div className="max-h-64 overflow-y-auto border rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 sticky top-0"><tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                                <th className="p-2">Brand</th><th className="p-2">Model</th><th className="p-2">Variants</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-200">
                                {parsedData.map((p, i) => (
                                    <tr key={i} className="bg-white">
                                        <td className="p-2 font-medium">{p.brand}</td>
                                        <td className="p-2">{p.modelName}</td>
                                        <td className="p-2">{p.variants.length}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            case 'complete': return (
                <div className="text-center p-8">
                    <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500" />
                    <h3 className="text-2xl font-bold mt-4">Import Complete</h3>
                    <p className="text-slate-600 mt-2">Your products have been successfully imported.</p>
                    <div className="flex justify-center gap-4 mt-6">
                        <div className="p-4 bg-slate-100 rounded-lg"><p className="text-2xl font-bold">{importSummary.created}</p><p className="text-sm">Created</p></div>
                        <div className="p-4 bg-slate-100 rounded-lg"><p className="text-2xl font-bold">{importSummary.updated}</p><p className="text-sm">Updated</p></div>
                        <div className="p-4 bg-slate-100 rounded-lg"><p className="text-2xl font-bold">{errors.length}</p><p className="text-sm">Failed</p></div>
                    </div>
                </div>
            );
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={handleClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold text-slate-800">Bulk Import Products</h3>
                    <p className="text-sm text-slate-500">Upload a CSV file to add or update products in bulk.</p>
                </div>
                <div className="p-6 space-y-4 flex-grow">
                    {importStatus === 'idle' && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                            <p className="font-semibold mb-1">CSV Format Instructions:</p>
                             <ul className="list-disc list-inside space-y-1">
                                <li>Required columns: `brand`, `modelName`, `variantName`, `color`, `sku`, `price`. Optional: `engine`, `mileage`.</li>
                                <li>The system intelligently updates or creates products based on your file.</li>
                                <li><strong>To update an existing product</strong>, ensure the `brand` and `modelName` match exactly.</li>
                                <li>The `sku` is used to identify variants. If a matching `sku` is found within that product, its `variantName` and `price` will be updated.</li>
                                <li>If the `sku` is new for an existing product, a new variant will be added to it.</li>
                                <li><strong>To create a new product</strong>, use a `brand` and `modelName` combination that doesn't already exist.</li>
                            </ul>
                            <button onClick={downloadTemplate} className="font-semibold text-blue-600 hover:underline mt-2 flex items-center gap-1"><DownloadIcon className="w-4 h-4" /> Download Template</button>
                        </div>
                    )}
                    {renderContent()}
                </div>
                <div className="px-6 py-4 bg-slate-50 flex justify-between items-center">
                    {file && <div className="flex items-center gap-2 text-sm text-slate-600"><FileTextIcon className="w-5 h-5" /><span>{file.name}</span></div>}
                    <div className="flex-grow text-right space-x-2">
                        <button onClick={handleClose} className="py-2 px-4 border border-slate-300 rounded-md text-sm font-medium">
                            {importStatus === 'complete' ? 'Close' : 'Cancel'}
                        </button>
                        {importStatus === 'preview' && (
                            <button onClick={handleImport} disabled={parsedData.length === 0} className="py-2 px-4 bg-primary text-white rounded-md text-sm font-medium disabled:bg-slate-400">
                                Start Import ({parsedData.length} Products)
                            </button>
                        )}
                         {importStatus === 'complete' && (
                            <button onClick={resetState} className="py-2 px-4 bg-primary text-white rounded-md text-sm font-medium">
                                Import Another File
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;