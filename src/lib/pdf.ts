import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Renders an element to a white-background PDF (black ink), paginated across
 * as many A4 pages as the content needs.
 *
 * The target element should be styled as a print sheet: `bg-white` with
 * explicit black/gray (hex) colors — html2canvas cannot parse the oklch
 * colors behind Tailwind v4 theme tokens.
 */
export async function exportElementAsPdf(
  el: HTMLElement,
  filename: string
): Promise<void> {
  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const imgData = canvas.toDataURL('image/png')

  // Draw the full image on every page, shifted up so exactly one page-worth
  // of content is visible; PDF viewers clip at the page box.
  let page = 0
  for (let offset = 0; offset < imgHeight; offset += pageHeight) {
    if (page > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, -offset, imgWidth, imgHeight)
    page += 1
  }

  pdf.save(filename)
}
