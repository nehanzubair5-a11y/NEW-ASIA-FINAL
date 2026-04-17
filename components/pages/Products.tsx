import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductVariant } from '../../types.ts';
import { PlusIcon, EditIcon, ChevronDownIcon, ChevronUpIcon, PackageIcon, PrintIcon, ChevronsUpDownIcon, UploadCloudIcon, DownloadIcon } from '../icons/Icons.tsx';
import ProductModal from '../modals/ProductModal.tsx';
import BulkImportModal from '../modals/BulkImportModal.tsx';
import { useData } from '../../hooks/useData.ts';
import Tooltip from '../shared/Tooltip.tsx';
import SkeletonLoader from '../shared/SkeletonLoader.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { printElementById, exportToCsv } from '../../utils/print.ts';

type SortableKey = 'brand' | 'modelName' | 'startingPrice';
type SortDirection = 'ascending' | 'descending';

const Products: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { products, addProduct, updateProduct, isLoading } = useData();
    const { canCreateProduct, canUpdateProduct, canUpdateProductCore, canManageVariants } = usePermissions();

    const [isModalOpen, setModalOpen] = useState(false);
    const [isBulkImportOpen, setBulkImportOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [brandFilter, setBrandFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: SortDirection } | null>({ key: 'modelName', direction: 'ascending' });

    const uniqueBrands = useMemo(() => [...new Set(products.map(p => p.brand))], [products]);

    const filteredProducts = useMemo(() => {
        let tempProducts = [...products];

        if (brandFilter !== 'all') {
            tempProducts = tempProducts.filter(p => p.brand === brandFilter);
        }

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            tempProducts = tempProducts.filter(p => 
                p.brand.toLowerCase().includes(lowercasedQuery) ||
                p.modelName.toLowerCase().includes(lowercasedQuery) ||
                p.variants.some(v => 
                    v.name.toLowerCase().includes(lowercasedQuery) ||
                    v.sku.toLowerCase().includes(lowercasedQuery) ||
                    v.color.toLowerCase().includes(lowercasedQuery)
                )
            );
        }
        return tempProducts;
    }, [products, searchQuery, brandFilter]);

    const sortedProducts = useMemo(() => {
        let sortableItems = [...filteredProducts];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: string | number;
                let bValue: string | number;
                
                if (sortConfig.key === 'startingPrice') {
                    aValue = a.variants[0]?.price ?? 0;
                    bValue = b.variants[0]?.price ?? 0;
                } else {
                    aValue = a[sortConfig.key];
                    bValue = b[sortConfig.key];
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredProducts, sortConfig]);

    useEffect(() => {
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            const newExpandedRows: Record<string, boolean> = {};
            sortedProducts.forEach(product => {
                const hasMatchingVariant = product.variants.some(v =>
                    v.name.toLowerCase().includes(lowercasedQuery) ||
                    v.sku.toLowerCase().includes(lowercasedQuery) ||
                    v.color.toLowerCase().includes(lowercasedQuery)
                );
                if (hasMatchingVariant) {
                    newExpandedRows[product._id] = true;
                }
            });
            setExpandedRows(newExpandedRows);
        } else {
            setExpandedRows({});
        }
    }, [searchQuery, sortedProducts]);

    const isVariantMatch = (variant: ProductVariant, query: string): boolean => {
        if (!query) return false;
        const lowercasedQuery = query.toLowerCase();
        return (
            variant.name.toLowerCase().includes(lowercasedQuery) ||
            variant.sku.toLowerCase().includes(lowercasedQuery) ||
            variant.color.toLowerCase().includes(lowercasedQuery)
        );
    };

    const requestSort = (key: SortableKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortIndicator = ({ columnKey }: { columnKey: SortableKey }) => {
        if (!sortConfig || sortConfig.key !== columnKey) {
            return <ChevronsUpDownIcon className="w-4 h-4 text-slate-400" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <ChevronUpIcon className="w-4 h-4" />;
        }
        return <ChevronDownIcon className="w-4 h-4" />;
    };

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedProduct(null);
        setModalOpen(true);
    };

    const handleSave = async (productData: Product | Omit<Product, '_id' | 'priceHistory'>, isEditing: boolean) => {
        if (isEditing) {
            await updateProduct(productData as Product);
            showToast('Product updated successfully!', 'success');
        } else {
            await addProduct(productData as Omit<Product, '_id'>);
            showToast('New product created!', 'success');
        }
        setModalOpen(false);
    };
    
    const handleToggleRow = (productId: string) => {
        setExpandedRows(prev => ({ ...prev, [productId]: !prev[productId] }));
    };

    const handleToggleHistory = (productId: string) => {
        setExpandedHistory(prev => ({ ...prev, [productId]: !prev[productId] }));
    };
    
    const handleExport = () => {
        const flattenedData = sortedProducts.flatMap(p => 
            p.variants.map(v => ({
                brand: p.brand,
                modelName: p.modelName,
                variantName: v.name,
                color: v.color,
                sku: v.sku,
                price: v.price,
                engine: p.specifications.engine,
                mileage: p.specifications.mileage,
            }))
        );
        
        if (flattenedData.length === 0) {
            showToast("There are no products to export.", "info");
            return;
        }
    
        const today = new Date().toISOString().split('T')[0];
        exportToCsv(`products_export_${today}.csv`, flattenedData);
    };
    
    const handleClearFilters = () => {
        setSearchQuery('');
        setBrandFilter('all');
    };
    
    const groupedVariants = (variants: ProductVariant[]) => {
        return variants.reduce((acc, variant) => {
            (acc[variant.name] = acc[variant.name] || []).push(variant);
            return acc;
        }, {} as Record<string, ProductVariant[]>);
    }

    if (isLoading) {
        return <SkeletonLoader type="table" rows={4} />;
    }

    return (
        <div id="products-page-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800">Manage Products</h2>
                <div className="flex items-center space-x-2">
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('products-page-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                    <Tooltip content="Export to CSV">
                        <button onClick={handleExport} className="flex items-center justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            <DownloadIcon />
                        </button>
                    </Tooltip>
                    {canCreateProduct && (
                        <>
                            <Tooltip content="Import from CSV">
                                <button onClick={() => setBulkImportOpen(true)} className="flex items-center space-x-2 py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                                    <UploadCloudIcon />
                                </button>
                            </Tooltip>
                            <button onClick={handleAddNew} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                                <PlusIcon />
                                <span>Add New Product</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
                     <div className="relative w-full md:w-64">
                        <input 
                            type="text" 
                            placeholder="Search model, variant, SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary w-full"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                     <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                        <label htmlFor="brand-filter" className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">Brand:</label>
                        <select
                            id="brand-filter"
                            value={brandFilter}
                            onChange={(e) => { setBrandFilter(e.target.value); }}
                            className="w-full md:w-auto p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-800"
                        >
                            <option value="all">All Brands</option>
                            {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                    </div>
                </div>
                 <button 
                    onClick={handleClearFilters}
                    className="py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                >
                    Clear Filters
                </button>
            </div>

            <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Products List</h1>
                <p className="text-sm text-slate-600 mb-4">Generated on: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/80">
                            <tr>
                                <th className="px-2 py-3 w-12 no-print"></th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => requestSort('brand')} className="flex items-center space-x-1 group">
                                        <span>Brand</span>
                                        <SortIndicator columnKey="brand" />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <div className="flex items-baseline space-x-1">
                                        <button onClick={() => requestSort('modelName')} className="flex items-center space-x-1 group">
                                            <span>Model</span>
                                            <SortIndicator columnKey="modelName" />
                                        </button>
                                        <span className="text-slate-300">/</span>
                                        <button onClick={() => requestSort('startingPrice')} className="flex items-center space-x-1 group">
                                            <span>Price</span>
                                            <SortIndicator columnKey="startingPrice" />
                                        </button>
                                    </div>
                                </th>
                                <th className="px-6 py-3 w-16 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider no-print">History</th>
                                {canUpdateProduct && <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider no-print">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {sortedProducts.length > 0 ? sortedProducts.map(product => (
                                <React.Fragment key={product._id}>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-2 py-4 whitespace-nowrap text-center no-print">
                                            {product.variants.length > 1 && (
                                                <Tooltip content={expandedRows[product._id] ? 'Hide Variants' : 'Show Variants'}>
                                                    <button onClick={() => handleToggleRow(product._id)} className="text-slate-500 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200">
                                                        {expandedRows[product._id] ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                            <span className={product.brand === 'Ramza' ? 'text-teal-600' : 'text-slate-900'}>{product.brand}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                {product.imageUrl && (
                                                    <img src={product.imageUrl} alt={product.modelName} className="w-10 h-10 object-cover rounded-md border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-medium text-slate-900">{product.modelName}</div>
                                                        {product.isActive === false && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                                Archived
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {product.variants.length > 1 ? 'From ' : ''}
                                                        <span className="font-semibold">{product.variants[0]?.price.toLocaleString() ?? 'N/A'}</span>
                                                        <span className="text-xs ml-1">PKR</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center no-print">
                                            {product.priceHistory && product.priceHistory.length > 0 && (
                                                <Tooltip content={expandedHistory[product._id] ? 'Hide Price History' : 'Show Price History'}>
                                                    <button onClick={() => handleToggleHistory(product._id)} className="text-slate-500 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200">
                                                        {expandedHistory[product._id] ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </td>
                                        {canUpdateProduct && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium no-print">
                                                <Tooltip content="Edit Product Details">
                                                    <button onClick={() => handleEdit(product)} className="text-indigo-600 hover:text-indigo-900 transition-colors p-1 rounded-full hover:bg-indigo-100">
                                                        <EditIcon />
                                                    </button>
                                                </Tooltip>
                                            </td>
                                        )}
                                    </tr>
                                    {expandedRows[product._id] && (
                                        <tr className="bg-slate-50/50 dark:bg-slate-900/20 no-print">
                                            <td colSpan={canUpdateProduct ? 5 : 4} className="p-0">
                                                <div className="p-4 mx-4 my-2 border-l-4 border-accent bg-slate-100 dark:bg-slate-800 rounded-r-md">
                                                     {Object.entries(groupedVariants(product.variants)).map(([variantName, variants]) => (
                                                        <div key={variantName} className="mb-4 last:mb-0">
                                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-4 mb-2">{variantName}</h4>
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full">
                                                                    <thead className="bg-slate-200 dark:bg-slate-700">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Color</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">SKU</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Price</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white dark:bg-slate-800">
                                                                        {variants.map(variant => (
                                                                            <tr
                                                                                key={variant._id}
                                                                                className={isVariantMatch(variant, searchQuery) ? 'bg-blue-100 dark:bg-blue-900/50' : ''}
                                                                            >
                                                                                <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-200">{variant.color}</td>
                                                                                <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-mono">{variant.sku}</td>
                                                                                <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-200 font-semibold">{variant.price.toLocaleString()}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                     ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {expandedHistory[product._id] && (
                                        <tr className="bg-slate-50 dark:bg-slate-900/20 no-print">
                                            <td colSpan={canUpdateProduct ? 5 : 4}>
                                                <div className="p-4 mx-4 my-2 border-l-4 border-yellow-400 bg-slate-100 dark:bg-slate-800 rounded-r-md">
                                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-4 mb-2">Price Change History</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full">
                                                            <thead className="bg-slate-200 dark:bg-slate-700">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Date Changed</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Price (PKR)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white dark:bg-slate-800">
                                                                {product.priceHistory?.map((history, index) => (
                                                                    <tr key={index}>
                                                                        <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">{new Date(history.timestamp).toLocaleString()}</td>
                                                                        <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-200 font-semibold">{history.price.toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan={canUpdateProduct ? 5 : 4}>
                                        <EmptyState
                                            icon={<PackageIcon className="w-10 h-10" />}
                                            title={searchQuery ? "No Products Found" : "No Products Yet"}
                                            message={searchQuery ? "Your search didn't match any products. Try a different query." : "Get started by adding your first product to the system."}
                                            action={canCreateProduct && !searchQuery ? (
                                                <button onClick={handleAddNew} className="flex items-center justify-center w-40 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary no-print">
                                                    <PlusIcon />
                                                    <span>Add Product</span>
                                                </button>
                                            ) : undefined}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <ProductModal 
                isOpen={isModalOpen} 
                onClose={() => setModalOpen(false)} 
                onSave={handleSave} 
                product={selectedProduct}
                canUpdateCore={canUpdateProductCore}
                canManageVariants={canManageVariants}
                showToast={showToast}
            />
            <BulkImportModal isOpen={isBulkImportOpen} onClose={() => setBulkImportOpen(false)} showToast={showToast} />
        </div>
    );
};
export default Products;