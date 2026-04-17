import React from 'react';
import type { StockOrder } from '../../types.ts';
import { PrintIcon } from '../icons/Icons.tsx';
import { useData } from '../../hooks/useData.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { printElementById } from '../../utils/print.ts';

interface StockOrderInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: StockOrder | null;
    approvedQuantities: Record<string, number>;
}

const StockOrderInvoiceModal: React.FC<StockOrderInvoiceModalProps> = ({ isOpen, onClose, order, approvedQuantities }) => {
    const { products, dealers, dealerPayments } = useData();
    const { settings } = useAppContext();

    const handlePrint = () => {
        printElementById('printable-stock-invoice');
    };

    const findProductInfo = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) {
                return { product, variant };
            }
        }
        return { product: null, variant: null };
    };

    if (!isOpen || !order) return null;

    const dealer = dealers.find(d => d._id === order.dealerId);
    
    const approvedItems = order.items
        .map(item => ({
            ...item,
            approvedQuantity: approvedQuantities[item.variantId] || 0,
        }))
        .filter(item => item.approvedQuantity > 0);

    const subTotal = approvedItems.reduce((sum, item) => {
        const { variant } = findProductInfo(item.variantId);
        return sum + (item.approvedQuantity * (variant?.price || 0));
    }, 0);

    const taxRate = settings.taxRate || 0;
    const taxAmount = (subTotal * taxRate) / 100;
    const totalValue = subTotal + taxAmount;

    const paymentsMade = dealerPayments
        .filter(p => p.stockOrderId === order._id)
        .reduce((sum, p) => sum + p.amount, 0);
        
    const balanceDue = totalValue - paymentsMade;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-start sm:items-center p-0 sm:p-4 no-print" onClick={onClose}>
            <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-3xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex-shrink-0 flex justify-between items-center no-print">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Pro-forma Invoice</h3>
                        <p className="text-sm text-gray-500">Order ID: #{order._id.slice(-6).toUpperCase()}</p>
                    </div>
                    <button onClick={handlePrint} className="flex items-center space-x-2 py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <PrintIcon />
                        <span>Print Invoice</span>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto bg-gray-50">
                    <div id="printable-stock-invoice" className="p-8 space-y-8">
                        {/* Invoice Header */}
                        <div className="flex justify-between items-start flex-wrap gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-primary">PRO-FORMA INVOICE</h1>
                                <p className="text-sm text-gray-500">Date Issued: {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-semibold">New Asia DMS</h2>
                                <p className="text-sm text-gray-600">Head Office, Pakistan</p>
                            </div>
                        </div>

                        {/* Billed To / From */}
                        <div className="grid grid-cols-2 gap-8 pt-8 border-t">
                            <div>
                                <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-xs">Billed To</h4>
                                <p className="text-gray-800 font-medium">{dealer?.name}</p>
                                <p className="text-gray-600 text-sm">{dealer?.ownerName}</p>
                                <p className="text-gray-600 text-sm">{dealer?.city}</p>
                            </div>
                             <div className="text-right">
                                <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-xs">Order ID</h4>
                                <p className="text-gray-800 font-medium font-mono">#{order._id.slice(-6).toUpperCase()}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border rounded-lg overflow-hidden overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {approvedItems.map((item, index) => {
                                        const { product, variant } = findProductInfo(item.variantId);
                                        const total = item.approvedQuantity * (variant?.price || 0);
                                        return (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {product?.brand} {product?.modelName} ({variant?.name})
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{item.approvedQuantity}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">Rs. {variant?.price.toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">Rs. {total.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-100 font-semibold">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-800">Subtotal</td>
                                        <td className="px-6 py-3 text-right text-sm text-gray-800">Rs. {subTotal.toLocaleString()}</td>
                                    </tr>
                                    {taxRate > 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-800">Tax ({taxRate}%)</td>
                                            <td className="px-6 py-3 text-right text-sm text-gray-800">Rs. {taxAmount.toLocaleString()}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-800">Total Order Value</td>
                                        <td className="px-6 py-3 text-right text-sm text-gray-800">Rs. {totalValue.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} className="px-6 py-3 text-right text-sm text-green-700">Payments Received</td>
                                        <td className="px-6 py-3 text-right text-sm text-green-700">Rs. {paymentsMade.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-right text-base text-gray-900">Balance Due</td>
                                        <td className="px-6 py-4 text-right text-base text-gray-900">Rs. {balanceDue.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-100 text-right rounded-b-lg flex-shrink-0 no-print">
                    <button onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Close</button>
                </div>
            </div>
        </div>
    );
};

export default StockOrderInvoiceModal;