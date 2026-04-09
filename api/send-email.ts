import type { Request, Response } from 'express';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';

type InvoiceItem = {
  name: string;
  quantity: number;
  price: number | string;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const toNumericPrice = (value: number | string) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildInvoicePdfBuffer = ({
  name,
  email,
  items,
  total,
  invoiceNumber,
  issuedAt,
}: {
  name: string;
  email: string;
  items: InvoiceItem[];
  total: number;
  invoiceNumber: string;
  issuedAt: Date;
}) => {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const subtotal = items.reduce((acc, item) => {
      const unitPrice = toNumericPrice(item.price);
      return acc + (unitPrice * item.quantity);
    }, 0);

    doc.fillColor('#111111').fontSize(24).font('Helvetica-Bold').text('AIO Guitar Shop', { align: 'left' });
    doc.fontSize(12).font('Helvetica').fillColor('#4b5563').text('Premium instruments for modern musicians');
    doc.moveDown(0.7);

    doc.fillColor('#111111').fontSize(20).font('Helvetica-Bold').text('Invoice', { align: 'left' });
    doc.font('Helvetica').fontSize(10).fillColor('#4b5563').text(`Invoice #: ${invoiceNumber}`);
    doc.text(`Issued: ${issuedAt.toLocaleString()}`);
    doc.moveDown();

    doc.fillColor('#111111').fontSize(12).font('Helvetica-Bold').text('Bill To');
    doc.font('Helvetica').fontSize(11).text(`Customer: ${name || 'User'}`);
    doc.text(`Email: ${email}`);
    doc.moveDown();

    const tableStartY = doc.y + 4;
    const columnX = {
      item: 48,
      qty: 315,
      unit: 380,
      line: 470,
    };
    doc.moveTo(48, tableStartY - 6).lineTo(548, tableStartY - 6).strokeColor('#d1d5db').stroke();

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111');
    doc.text('Item', columnX.item, tableStartY);
    doc.text('Qty', columnX.qty, tableStartY);
    doc.text('Unit Price', columnX.unit, tableStartY);
    doc.text('Line Total', columnX.line, tableStartY);
    doc.moveDown(1.2);

    doc.font('Helvetica').fontSize(10).fillColor('#111111');

    items.forEach((item) => {
      const unitPrice = toNumericPrice(item.price);
      const lineTotal = unitPrice * item.quantity;
      const y = doc.y;
      doc.text(item.name, columnX.item, y, { width: 250 });
      doc.text(String(item.quantity), columnX.qty, y);
      doc.text(formatCurrency(unitPrice), columnX.unit, y);
      doc.text(formatCurrency(lineTotal), columnX.line, y);
      doc.moveDown(0.8);
    });

    doc.moveDown(0.6);
    doc.moveTo(48, doc.y).lineTo(548, doc.y).strokeColor('#d1d5db').stroke();
    doc.moveDown(0.8);

    doc.font('Helvetica').fontSize(11).fillColor('#111111').text(`Subtotal: ${formatCurrency(subtotal)}`, { align: 'right' });
    doc.font('Helvetica').fontSize(11).fillColor('#111111').text(`Shipping: ${formatCurrency(0)}`, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111111').text(`Total Paid: ${formatCurrency(total)}`, { align: 'right' });

    doc.moveDown(1.5);
    doc.font('Helvetica').fontSize(10).fillColor('#4b5563').text('Thank you for shopping with AIO Guitar Shop.', { align: 'center' });
    doc.text('For support, reply to your order confirmation email.', { align: 'center' });
    doc.end();
  });
};

export default async function sendEmailHandler(req: Request, res: Response) {
  const { email, items, total, name } = req.body ?? {};

  if (!email || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  }

  const resend = new Resend(resendApiKey);
  const safeItems: InvoiceItem[] = items.map((item: any) => ({
    name: String(item?.name ?? 'Item'),
    quantity: Number(item?.quantity ?? 1) || 1,
    price: item?.price ?? 0,
  }));
  const safeTotal = Number(total) || 0;
  const safeName = String(name ?? 'User');
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const issuedAt = new Date();
  const invoiceNumber = `AIO-${issuedAt.getTime().toString().slice(-8)}`;

  try {
    const pdfBuffer = await buildInvoicePdfBuffer({
      name: safeName,
      email: String(email),
      items: safeItems,
      total: safeTotal,
      invoiceNumber,
      issuedAt,
    });

    const itemRowsHtml = safeItems
      .map((item) => {
        const unitPrice = toNumericPrice(item.price);
        const lineTotal = unitPrice * item.quantity;
        return `<tr>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;">${item.name}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(unitPrice)}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(lineTotal)}</td>
        </tr>`;
      })
      .join('');

    await resend.emails.send({
      from: fromEmail,
      to: String(email),
      subject: `Your Invoice ${invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#111827; max-width:680px; margin:0 auto;">
          <h2 style="margin-bottom:4px;">Thanks for your order, ${safeName}!</h2>
          <p style="margin-top:0;color:#6b7280;">Invoice <strong>${invoiceNumber}</strong> issued on ${issuedAt.toLocaleString()}.</p>
          <p>Your PDF invoice is attached. Here is a quick summary:</p>
          <table style="border-collapse: collapse; width:100%; margin:16px 0; font-size:14px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:left;">Item</th>
                <th style="padding:8px 10px;border:1px solid #e5e7eb;">Qty</th>
                <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;">Unit</th>
                <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;">Line</th>
              </tr>
            </thead>
            <tbody>
              ${itemRowsHtml}
            </tbody>
          </table>
          <p style="font-size:16px;"><strong>Total Paid: ${formatCurrency(safeTotal)}</strong></p>
          <p style="color:#6b7280;">Need help? Reply to this email and our team will assist.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'invoice.pdf',
          content: pdfBuffer,
        },
      ],
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('send-email error:', error);
    return res.status(500).json({ error: 'Failed to send invoice email' });
  }
}
