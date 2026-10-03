import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const colorCache = new Map<string, string>();

function resolveCssColor(colorStr: string): string {
  if (!colorStr) return '#000000';
  if (colorCache.has(colorStr)) return colorCache.get(colorStr)!;

  let resolved = '#000000';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a === 0) {
        resolved = 'transparent';
      } else if (a === 255) {
        resolved = `rgb(${r}, ${g}, ${b})`;
      } else {
        resolved = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
      }
    }
  } catch (e) {
    resolved = '#000000';
  }

  colorCache.set(colorStr, resolved);
  return resolved;
}

function cleanUnsupportedColors(cssText: string): string {
  if (!cssText) return cssText;
  return cssText.replace(/(oklch|oklab|lch|lab|color-mix)\([^\)]*(?:\([^\)]*\)[^\)]*)*\)/gi, (match) => {
    return resolveCssColor(match);
  });
}

export async function exportElementToPdf(
  element: HTMLElement | null,
  fileName: string = 'document.pdf',
  isLandscape: boolean = false
): Promise<boolean> {
  if (!element) {
    window.print();
    return true;
  }

  // Find the true document child node if wrapped
  const targetElement = (element.querySelector('.printable-receipt') ||
    element.querySelector('.printable-invoice-a4') ||
    element.querySelector('.printable-invoice') ||
    element.querySelector('.printable-voucher') ||
    element.querySelector('.printable-report') ||
    element.querySelector('.printable-barcodes') ||
    element.querySelector('.printable-document') ||
    element.firstElementChild ||
    element) as HTMLElement;

  try {
    const isThermal =
      targetElement.classList.contains('printable-receipt') ||
      targetElement.offsetWidth <= 420;

    const canvas = await html2canvas(targetElement, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: isThermal ? 400 : (isLandscape ? 1200 : 1200),
      windowHeight: targetElement.scrollHeight + 100,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, clonedEl) => {
        // Remove dark mode class from html, body, and cloned element hierarchy to force pure light-mode rendering
        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.classList.remove('dark');
        }
        if (clonedDoc.body) {
          clonedDoc.body.classList.remove('dark');
        }
        let current: HTMLElement | null = clonedEl;
        while (current) {
          current.classList.remove('dark');
          current = current.parentElement;
        }

        // 1. Sanitize all <style> tags in the cloned document for html2canvas parser
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach((styleTag) => {
          if (styleTag.textContent) {
            styleTag.textContent = cleanUnsupportedColors(styleTag.textContent);
          }
        });

        // 2. Sanitize all inline styles across all cloned elements
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.getAttribute && htmlEl.getAttribute('style')) {
            const currentStyle = htmlEl.getAttribute('style') || '';
            if (/(oklch|oklab|lch|lab|color-mix)/i.test(currentStyle)) {
              htmlEl.setAttribute('style', cleanUnsupportedColors(currentStyle));
            }
          }
        });

        // 3. Clean up any broken or hidden images
        const imgElements = clonedDoc.querySelectorAll('img');
        imgElements.forEach((img) => {
          const htmlImg = img as HTMLImageElement;
          if (!htmlImg.src || htmlImg.src.trim() === '' || htmlImg.style.display === 'none' || htmlImg.classList.contains('hidden')) {
            htmlImg.style.display = 'none';
          }
        });

        // 4. Force solid white background and crisp layout for clone
        if (clonedEl) {
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.color = '#000000';
          clonedEl.style.margin = '0 auto';
          clonedEl.style.boxShadow = 'none';
          clonedEl.style.border = 'none';
          if (!isThermal) {
            clonedEl.style.width = isLandscape ? '1123px' : '794px'; // standard A4 width at 96 DPI
            clonedEl.style.minWidth = isLandscape ? '1123px' : '794px';
            clonedEl.style.maxWidth = isLandscape ? '1123px' : '794px';
          }
        }
      },
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    if (isThermal) {
      // 80mm thermal receipt sizing
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, Math.max(pdfHeight, 60)],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(fileName);
      return true;
    }

    // Standard A4 PDF generation
    const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm or 297mm
    const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm or 210mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (pdfHeight <= pdfPageHeight + 2) {
      // Single page document
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    } else {
      // Multi-page document
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
      heightLeft -= pdfPageHeight;

      while (heightLeft > 0) {
        position = -(pdfHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
        heightLeft -= pdfPageHeight;
      }
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    window.print();
    return false;
  }
}

