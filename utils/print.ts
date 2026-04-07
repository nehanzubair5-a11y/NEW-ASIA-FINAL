/**
 * Formats a phone number for WhatsApp "Click-to-Chat" links.
 * Assumes Pakistani numbers starting with '03'.
 * Converts '03001234567' to '923001234567'.
 * @param phone The phone number string.
 * @returns A formatted phone number string.
 */
const formatPhoneNumberForWhatsApp = (phone: string): string => {
    if (!phone) return '';
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If it starts with '03', replace '0' with '92'
    if (digitsOnly.startsWith('03')) {
        return `92${digitsOnly.substring(1)}`;
    }
    
    // If it already starts with '923', it's likely correct
    if (digitsOnly.startsWith('923')) {
        return digitsOnly;
    }

    // Fallback for other formats - might not be perfect
    return digitsOnly;
};

/**
 * Creates a WhatsApp "Click-to-Chat" link.
 * @param phone The phone number.
 * @param message An optional pre-filled message.
 * @returns The complete WhatsApp URL.
 */
export const createWhatsAppLink = (phone: string, message?: string): string => {
    const formattedPhone = formatPhoneNumberForWhatsApp(phone);
    if (!formattedPhone) return '#';
    
    const url = `https://wa.me/${formattedPhone}`;
    if (message) {
        return `${url}?text=${encodeURIComponent(message)}`;
    }
    return url;
};


/**
 * Prints the content of a specific HTML element by opening it in a new window.
 * This is a robust method that avoids modifying the current document's DOM
 * and works well in sandboxed environments like iframes.
 * @param elementId The ID of the HTML element to print.
 */
export function printElementById(elementId: string): void {
  const elementToPrint = document.getElementById(elementId);
  if (!elementToPrint) {
    console.error(`Print failed: Element with ID "${elementId}" not found.`);
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // This can happen if pop-ups are blocked.
    alert('Please allow pop-ups for this site to enable printing.');
    return;
  }

  // Copy all <link> and <style> elements from the main document's head to the new window.
  // This ensures that all CSS, including Tailwind and custom styles, is available.
  printWindow.document.head.innerHTML = document.head.innerHTML;
  
  // The @media print rules in the original CSS will take care of formatting.
  // We wrap the content to ensure it's a valid body.
  printWindow.document.body.innerHTML = elementToPrint.outerHTML;

  // A short delay is crucial to give the browser time to load and parse the styles
  // in the new window before triggering the print dialog.
  setTimeout(() => {
    try {
      printWindow.focus(); // Necessary for some browsers to bring the print dialog to the front.
      printWindow.print();
    } catch (e) {
      console.error("Printing failed:", e);
    } finally {
      // The print dialog is blocking, so this will execute after the user interacts with it.
      printWindow.close();
    }
  }, 250); // 250ms is a safe delay for local styles.
}


/**
 * Escapes a value for use in a CSV file, handling commas, quotes, and newlines.
 * @param value The value to escape.
 * @returns The escaped string.
 */
const escapeCsvValue = (value: any): string => {
    const str = String(value == null ? '' : value);
    // If the value contains commas, quotes, or newlines, wrap it in double quotes
    if (/[",\n\r]/.test(str)) {
        // Within a quoted field, any double quote character must be escaped by preceding it with another double quote.
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

/**
 * Converts an array of objects into a CSV string and triggers a browser download.
 * Includes a BOM for better Excel compatibility with special characters.
 * @param filename The desired filename for the downloaded file (e.g., 'data.csv').
 * @param rows An array of objects to be converted to CSV.
 */
export const exportToCsv = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) {
        console.error("Export failed: No data to export.");
        return;
    }
    const header = Object.keys(rows[0]);
    const csvContent = [
        header.join(','),
        ...rows.map(row => header.map(fieldName => escapeCsvValue((row as any)[fieldName])).join(','))
    ].join('\n');

    // \uFEFF is the Byte Order Mark (BOM) for UTF-8, which helps Excel open the CSV correctly.
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};
