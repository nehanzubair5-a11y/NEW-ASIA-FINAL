import React, { useState, useEffect, useMemo } from 'react';
import type { Product, ProductVariant } from '../../types.ts';
import { XCircleIcon, PlusIcon } from '../icons/Icons.tsx';
import Spinner from '../shared/Spinner.tsx';
import { useData } from '../../hooks/useData.ts';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: Product | Omit<Product, '_id' | 'priceHistory'>, isEditing: boolean) => Promise<void>;
    product: Product | null;
    canUpdateCore: boolean;
    canManageVariants: boolean;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Internal state structure for the UI
interface VariantGroup {
    id: string;
    name: string;
    colors: {
        id: string;
        color: string;
        sku: string;
        price: number;
        error?: string;
    }[];
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, canUpdateCore, canManageVariants, showToast }) => {
    const { products: allProducts } = useData();
    const [brand, setBrand] = useState('');
    const [modelName, setModelName] = useState('');
    const [specifications, setSpecifications] = useState({ engine: '', mileage: '' });
    const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
    const [isActive, setIsActive] = useState(true);
    const [imageUrl, setImageUrl] = useState('');
    
    const [isVisible, setIsVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const existingSkus = useMemo(() => {
        const skus = new Set<string>();
        allProducts.forEach(p => {
            // If we are editing a product, exclude its own SKUs from the check
            if (product && p._id === product._id) {
                return;
            }
            p.variants.forEach(v => skus.add(v.sku.toLowerCase()));
        });
        return skus;
    }, [allProducts, product]);

    const hasValidationErrors = useMemo(() => {
        return variantGroups.some(g => g.colors.some(c => !!c.error));
    }, [variantGroups]);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsSaving(false);
            if (product) {
                // Convert flat variant list to grouped structure for UI
                const groups = product.variants.reduce((acc, v) => {
                    let group = acc.find(g => g.name === v.name);
                    if (!group) {
                        group = { id: `group-${v.name}-${acc.length}`, name: v.name, colors: [] };
                        acc.push(group);
                    }
                    group.colors.push({ id: v._id, color: v.color, sku: v.sku, price: v.price, error: undefined });
                    return acc;
                }, [] as VariantGroup[]);
                
                setBrand(product.brand);
                setModelName(product.modelName);
                setSpecifications(product.specifications);
                setVariantGroups(groups.length > 0 ? groups : [{ id: `group-${Date.now()}`, name: '', colors: [{ id: `color-${Date.now()}`, color: '', sku: '', price: 0, error: undefined }] }]);
                setIsActive(product.isActive !== false);
                setImageUrl(product.imageUrl || '');
            } else {
                // Reset to blank form
                setBrand('');
                setModelName('');
                setSpecifications({ engine: '', mileage: '' });
                setVariantGroups([{ id: `group-${Date.now()}`, name: '', colors: [{ id: `color-${Date.now()}`, color: '', sku: '', price: 0, error: undefined }] }]);
                setIsActive(true);
                setImageUrl('');
            }
        } else {
            setTimeout(() => setIsVisible(false), 200);
        }
    }, [product, isOpen]);

    if (!isVisible) return null;

    const handleGroupChange = (index: number, field: 'name', value: string) => {
        const newGroups = [...variantGroups];
        newGroups[index][field] = value;
        setVariantGroups(newGroups);
    };

    const handleColorChange = (groupIndex: number, colorIndex: number, field: 'color' | 'sku' | 'price', value: string) => {
        const newGroups = [...variantGroups];
        const group = newGroups[groupIndex];
        const color = group.colors[colorIndex];
        
        // Update the value
        if (field === 'price') {
            color.price = Number(value);
        } else {
            (color as any)[field] = value;
        }
        
        // Real-time validation for SKU
        if (field === 'sku') {
            const lowercasedSku = value.toLowerCase().trim();
            color.error = undefined; // Reset error

            if (lowercasedSku) {
                // 1. Check for duplicates within the current form
                let isDuplicateInForm = false;
                for (let gi = 0; gi < newGroups.length; gi++) {
                    for (let ci = 0; ci < newGroups[gi].colors.length; ci++) {
                        if (gi === groupIndex && ci === colorIndex) continue; // Skip self
                        if (newGroups[gi].colors[ci].sku.toLowerCase().trim() === lowercasedSku) {
                            isDuplicateInForm = true;
                            break;
                        }
                    }
                    if (isDuplicateInForm) break;
                }

                if (isDuplicateInForm) {
                    color.error = "Duplicate SKU in this form.";
                } 
                // 2. Check for duplicates in the database (from other products)
                else if (existingSkus.has(lowercasedSku)) {
                    color.error = "This SKU is already in use.";
                }
            }
        }
        
        setVariantGroups(newGroups);
    };
    
    const addVariantGroup = () => {
        setVariantGroups(prev => [...prev, { id: `group-${Date.now()}`, name: '', colors: [{ id: `color-${Date.now()}`, color: '', sku: '', price: 0, error: undefined }] }]);
    };

    const removeVariantGroup = (index: number) => {
        if (variantGroups.length <= 1) return;
        setVariantGroups(prev => prev.filter((_, i) => i !== index));
    };
    
    const addColor = (groupIndex: number) => {
        const newGroups = [...variantGroups];
        newGroups[groupIndex].colors.push({ id: `color-${Date.now()}`, color: '', sku: '', price: 0, error: undefined });
        setVariantGroups(newGroups);
    };
    
    const removeColor = (groupIndex: number, colorIndex: number) => {
        if (variantGroups[groupIndex].colors.length <= 1) return;
        const newGroups = [...variantGroups];
        newGroups[groupIndex].colors = newGroups[groupIndex].colors.filter((_, i) => i !== colorIndex);
        setVariantGroups(newGroups);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (hasValidationErrors) {
            showToast("Please fix the validation errors before saving.", "error");
            return;
        }

        // Flatten UI state back to data model structure
        const variants: Omit<ProductVariant, '_id'>[] = [];
        for (const group of variantGroups) {
            for (const color of group.colors) {
                // Basic check for required fields
                if (!group.name || !color.color || !color.sku || !color.price || color.price <= 0) {
                     showToast("Please fill all required variant fields (Name, Color, SKU, and a valid Price).", "error");
                     return;
                }
                variants.push({
                    name: group.name,
                    price: Number(color.price),
                    color: color.color,
                    sku: color.sku,
                });
            }
        }

        setIsSaving(true);
        
        const productData = {
            brand,
            modelName,
            specifications,
            isActive,
            imageUrl,
            variants: variants.map((v, i) => ({ ...v, _id: `temp-id-${i}`}))
        };

        const dataToSave = product ? { ...productData, _id: product._id, priceHistory: product.priceHistory } : productData;
        try {
            await onSave(dataToSave, !!product);
        } catch (err) {
            showToast("Failed to save product.", "error");
            setIsSaving(false);
        }
    };

    const canSaveChanges = canUpdateCore || canManageVariants;

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start sm:items-center p-0 sm:p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
            <div className={`bg-white dark:bg-slate-800 rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-4xl flex flex-col transform transition-transform duration-200 ${isOpen ? 'scale-100' : 'scale-95'}`} onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{product ? 'Edit Product' : 'Add New Product'}</h3>
                    </div>
                    <div className="p-6 space-y-6 flex-grow overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
                        {/* Core Product Details */}
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                             <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Core Details</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="brand" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Brand</label>
                                    <input type="text" name="brand" id="brand" value={brand} onChange={e => setBrand(e.target.value)} required disabled={!canUpdateCore} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-700/50" />
                                </div>
                                <div>
                                    <label htmlFor="modelName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Model Name</label>
                                    <input type="text" name="modelName" id="modelName" value={modelName} onChange={e => setModelName(e.target.value)} required disabled={!canUpdateCore} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-700/50" />
                                </div>
                                 <div>
                                    <label htmlFor="engine" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Engine Spec</label>
                                    <input type="text" name="engine" id="engine" value={specifications.engine} onChange={e => setSpecifications(s => ({...s, engine: e.target.value}))} disabled={!canUpdateCore} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-700/50" />
                                </div>
                                <div>
                                    <label htmlFor="mileage" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mileage Spec</label>
                                    <input type="text" name="mileage" id="mileage" value={specifications.mileage} onChange={e => setSpecifications(s => ({...s, mileage: e.target.value}))} disabled={!canUpdateCore} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-700/50" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Image</label>
                                    <div className="flex items-center space-x-4">
                                        {imageUrl && (
                                            <img
                                                src={imageUrl}
                                                alt="Preview"
                                                className="h-16 w-16 object-cover rounded shadow-sm border border-slate-200 dark:border-slate-700"
                                                referrerPolicy="no-referrer"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                disabled={!canUpdateCore}
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            showToast("Image size must be less than 2MB", "error");
                                                            return;
                                                        }
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setImageUrl(reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="block w-full text-sm text-slate-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-md file:border-0
                                                    file:text-sm file:font-medium
                                                    file:bg-primary file:text-white
                                                    hover:file:bg-secondary
                                                    disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <p className="mt-1 text-xs text-slate-500">Suggested size: 500x500px, Max 2MB.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center mt-6">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        disabled={!canUpdateCore}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                    />
                                    <label htmlFor="isActive" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                        Product is Active (Available for new orders)
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Variants */}
                        <div>
                             <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Variants & Pricing</h4>
                             <div className="space-y-4">
                                {variantGroups.map((group, groupIndex) => (
                                    <div key={group.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 relative">
                                        <div className="grid grid-cols-1">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Variant Name</label>
                                                <input type="text" placeholder="e.g., NA-70cc" value={group.name} onChange={e => handleGroupChange(groupIndex, 'name', e.target.value)} required disabled={!canManageVariants} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-700/50"/>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-2">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Colors for this Variant</label>
                                             {group.colors.map((color, colorIndex) => (
                                                <div key={color.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                                    <div className="md:col-span-4">
                                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Color</label>
                                                        <input type="text" placeholder="e.g., Red" value={color.color} onChange={e => handleColorChange(groupIndex, colorIndex, 'color', e.target.value)} required disabled={!canManageVariants} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-700/50"/>
                                                    </div>
                                                    <div className="md:col-span-4">
                                                         <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">SKU</label>
                                                        <input type="text" placeholder="Unique SKU" value={color.sku} onChange={e => handleColorChange(groupIndex, colorIndex, 'sku', e.target.value)} required disabled={!canManageVariants} className={`w-full p-2 border rounded-md shadow-sm text-sm bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-700/50 ${color.error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-600'}`}/>
                                                        {color.error && <p className="text-xs text-red-600 mt-1">{color.error}</p>}
                                                    </div>
                                                     <div className="md:col-span-3">
                                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Price (PKR)</label>
                                                        <input type="number" placeholder="115000" value={color.price} onChange={e => handleColorChange(groupIndex, colorIndex, 'price', e.target.value)} required disabled={!canManageVariants} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-700/50"/>
                                                    </div>
                                                    <div className="text-right pt-6 md:col-span-1">
                                                        <button type="button" onClick={() => removeColor(groupIndex, colorIndex)} disabled={!canManageVariants || group.colors.length <= 1} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><XCircleIcon /></button>
                                                    </div>
                                                </div>
                                             ))}
                                             <button type="button" onClick={() => addColor(groupIndex)} disabled={!canManageVariants} className="mt-2 text-sm font-medium text-primary hover:underline disabled:opacity-50">Add Color</button>
                                        </div>
                                         {variantGroups.length > 1 && canManageVariants && (
                                            <button type="button" onClick={() => removeVariantGroup(groupIndex)} className="absolute -top-2 -right-2 text-red-500 bg-white dark:bg-slate-800 rounded-full hover:bg-red-50"><XCircleIcon /></button>
                                         )}
                                    </div>
                                ))}
                                {canManageVariants && <button type="button" onClick={addVariantGroup} className="mt-2 text-sm font-semibold text-primary hover:underline">Add Variant Group</button>}
                             </div>
                        </div>

                    </div>
                    <div className="px-6 py-4 bg-slate-100 dark:bg-slate-700/50 text-right space-x-2 rounded-b-lg flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={onClose} disabled={isSaving} className="py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={!canSaveChanges || isSaving || hasValidationErrors} className="w-32 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                           {isSaving ? <Spinner /> : (product ? 'Save Changes' : 'Save Product')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
