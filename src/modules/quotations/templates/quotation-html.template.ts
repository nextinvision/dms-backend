/**
 * Generates HTML template for quotation PDF
 */
export function generateQuotationHtmlTemplate(data: {
  quotation: any;
  serviceCenter: any;
  serviceAdvisor: any;
}): string {
  const { quotation, serviceCenter, serviceAdvisor } = data;

  const quotationDate = quotation.quotationDate
    ? new Date(quotation.quotationDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const validUntilDate = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "N/A";

  const itemsHTML =
    quotation.items && quotation.items.length > 0
      ? quotation.items
        .map(
          (item: any, index: number) => `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="font-weight: 500;">
                <div style="color: #111827;">${item.partName || "Item"}</div>
                ${item.partNumber ? `<div style="font-size: 10px; color: #6b7280;">PN: ${item.partNumber}</div>` : ""}
            </td>
            <td style="text-align: center;">${item.quantity || 0}</td>
            <td style="text-align: right;">₹${(item.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="text-align: center;">${item.gstPercent || 0}%</td>
            <td style="text-align: right; font-weight: 600;">₹${(item.amount || item.rate * item.quantity * (1 + (item.gstPercent || 18) / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
        `
        )
        .join("")
      : '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #9ca3af;">No items found in this quotation</td></tr>';

  const insuranceHTML =
    quotation.hasInsurance
      ? `
      <div style="margin-top: 20px; padding: 12px 16px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px; font-size: 12px;">
         <div style="display: flex; justify-content: space-between; align-items: center;">
             <div>
                <span style="font-weight: 700; color: #0369a1; text-transform: uppercase;">Insurance Claim</span>
                <span style="margin-left: 8px; color: #0c4a6e;">${quotation.insurer?.name || "Standard Insurance Plan"}</span>
             </div>
             <div style="color: #0c4a6e;">
                Validity: <b>${quotation.insuranceStartDate ? new Date(quotation.insuranceStartDate).toLocaleDateString("en-IN") : "N/A"}</b> to <b>${quotation.insuranceEndDate ? new Date(quotation.insuranceEndDate).toLocaleDateString("en-IN") : "N/A"}</b>
             </div>
         </div>
      </div>
      `
      : "";

  // Tax Calculations for Summary
  const subtotal = Number(quotation.subtotal) || 0;
  const discount = Number(quotation.discount) || 0;
  const discountPercent = Number(quotation.discountPercent) || 0;
  const taxableAmount = Number(quotation.preGstAmount) || (subtotal - discount);

  // Explicit tax values or fallback calculation
  const cgst = Number(quotation.cgst) || 0;
  const sgst = Number(quotation.sgst) || 0;
  const igst = Number(quotation.igst) || 0;
  const totalTax = cgst + sgst + igst || (Number(quotation.totalAmount) - taxableAmount);
  const totalAmount = Number(quotation.totalAmount) || (taxableAmount + totalTax);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${quotation.documentType || "Quotation"} ${quotation.quotationNumber}</title>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { margin: 0 !important; padding: 0 !important; }
            @page { margin: 0.5cm; size: A4; }
            .page-break { page-break-before: always; }
          }

          body {
            font-family: 'Outfit', sans-serif;
            background-color: #ffffff;
            color: #1f2937;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.5;
          }

          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #111827;
          }

          .brand-section h1 {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 5px 0;
            letter-spacing: -0.5px;
          }

          .brand-section p {
            margin: 0;
            color: #4b5563;
            font-size: 11px;
          }

          .invoice-meta {
            text-align: right;
          }

          .doc-title {
            font-size: 24px;
            font-weight: 300;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
          }

          .meta-table {
            float: right;
            border-collapse: collapse;
          }

          .meta-table td {
            padding: 2px 0 2px 15px;
            text-align: right;
          }

          .meta-label { color: #6b7280; font-weight: 500; }
          .meta-val { color: #111827; font-weight: 600; }

          /* Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
          }

          .info-box h3 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }

          .info-content {
            font-size: 13px;
          }
          
          .info-content strong { font-weight: 600; color: #111827; }
          .info-content div { margin-bottom: 4px; }

          /* Items Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          .items-table th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 10px;
            text-align: left;
            border-top: 2px solid #e5e7eb;
            border-bottom: 2px solid #e5e7eb;
          }

          .items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 12px;
            vertical-align: top;
          }
          
          .items-table tr:nth-child(even) { background-color: #fcfcfc; }

          /* Summary */
          .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
          }

          .summary-table {
            width: 300px;
            border-collapse: collapse;
          }

          .summary-table td {
            padding: 6px 0;
            text-align: right;
          }

          .summary-table .label { color: #6b7280; }
          .summary-table .value { color: #111827; font-weight: 500; }
          
          .summary-table .total-row td {
            border-top: 2px solid #111827;
            border-bottom: 2px solid #111827;
            padding: 12px 0;
            font-size: 16px;
            font-weight: 700;
            color: #111827;
          }

          /* Footer */
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
          }

          .terms {
            width: 60%;
            font-size: 10px;
            color: #6b7280;
          }

          .terms h4 {
            font-size: 11px;
            color: #374151;
            margin: 0 0 5px 0;
          }

          .terms ul { padding-left: 15px; margin: 0; }
          .terms li { margin-bottom: 2px; }

          .signatures {
            width: 30%;
            text-align: center;
          }

          .sign-line {
            margin-top: 40px;
            border-top: 1px solid #111827;
            padding-top: 8px;
            font-weight: 600;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="brand-section">
              <h1>${serviceCenter.name || "42 EV Tech & Services"}</h1>
              <div style="margin-top: 8px; line-height: 1.4;">
                ${serviceCenter.address || "Address Line 1"}<br>
                ${serviceCenter.city || "City"} ${serviceCenter.state ? `, ${serviceCenter.state}` : ""} ${serviceCenter.pincode || ""}<br>
                Phone: ${serviceCenter.phone || "+91 99999 99999"}<br>
                ${serviceCenter.gstNumber ? `GSTIN: <b>${serviceCenter.gstNumber}</b>` : ""}
              </div>
            </div>
            <div class="invoice-meta">
              <div class="doc-title">${quotation.documentType || "QUOTATION"}</div>
              <table class="meta-table">
                <tr><td class="meta-label">No:</td><td class="meta-val">#${quotation.quotationNumber}</td></tr>
                <tr><td class="meta-label">Date:</td><td class="meta-val">${quotationDate}</td></tr>
                ${validUntilDate !== "N/A" ? `<tr><td class="meta-label">Valid Until:</td><td class="meta-val">${validUntilDate}</td></tr>` : ""}
              </table>
            </div>
          </div>

          <!-- Info Grid -->
          <div class="info-grid">
            <div class="info-box">
              <h3>Bill To</h3>
              <div class="info-content">
                <strong>${quotation.customer?.name || `${quotation.customer?.firstName || ""} ${quotation.customer?.lastName || ""}`.trim() || "Guest Customer"}</strong><br>
                ${quotation.customer?.address ? `${quotation.customer.address}<br>` : ""}
                ${quotation.customer?.city ? `${quotation.customer.city}, ` : ""} ${quotation.customer?.state || ""}<br>
                Phone: ${quotation.customer?.phone || "N/A"}
              </div>
            </div>
            <div class="info-box">
              <h3>Vehicle Details</h3>
              <div class="info-content">
                <div style="font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px;">${quotation.vehicle?.registration || "N/A"}</div>
                <div>${quotation.vehicle?.make || ""} ${quotation.vehicle?.model || ""}</div>
                <div style="color: #6b7280; font-size: 11px;">VIN: ${quotation.vehicle?.vin || "N/A"}</div>
                <div>Odometer: ${quotation.odometer ? `${quotation.odometer} km` : "N/A"}</div>
              </div>
            </div>
          </div>

          ${insuranceHTML}

          <!-- Items -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">SL</th>
                <th>Description</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th style="width: 100px; text-align: right;">Rate</th>
                <th style="width: 60px; text-align: center;">Tax</th>
                <th style="width: 110px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <!-- Summary -->
          <div class="summary-section">
            <table class="summary-table">
              <tr>
                <td class="label">Subtotal</td>
                <td class="value">₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
              ${discount > 0 ? `
              <tr>
                <td class="label" style="color: #dc2626;">Discount ${discountPercent > 0 ? `(${discountPercent.toFixed(1)}%)` : ""}</td>
                <td class="value" style="color: #dc2626;">-₹${discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>` : ""}
              
              <!-- Tax Breakdown -->
              ${cgst > 0 ? `
              <tr>
                <td class="label">CGST</td>
                <td class="value">₹${cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>` : ""}
              ${sgst > 0 ? `
              <tr>
                <td class="label">SGST</td>
                <td class="value">₹${sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>` : ""}
              ${igst > 0 ? `
              <tr>
                <td class="label">IGST</td>
                <td class="value">₹${igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>` : ""}
              
              ${totalTax > 0 && cgst === 0 && sgst === 0 && igst === 0 ? `
              <tr>
                 <td class="label">GST (Total)</td>
                 <td class="value">₹${totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ""}

              <tr class="total-row">
                <td class="label" style="color: #111827;">Total Amount</td>
                <td class="value">₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                 <td colspan="2" style="text-align: right; padding-top: 10px; font-size: 10px; color: #6b7280; font-style: italic;">
                    (Price includes all applicable taxes)
                 </td>
              </tr>
            </table>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="terms">
              <h4>Terms & Conditions</h4>
              <ul>
                <li>Validity of this quotation is 30 days from the date of issue.</li>
                <li>Parts prices are subject to change without prior notice.</li>
                <li>Service charges may vary based on actual work performed.</li>
                <li>Delivery times are estimates and subject to parts availability.</li>
              </ul>
              
              <div style="margin-top: 15px;">
                <h4>Bank Details</h4>
                <div>Bank: <b>HDFC Bank</b></div>
                <div>A/C: <b>50200012345678</b> | IFSC: <b>HDFC0001234</b></div>
              </div>
            </div>
            
            <div class="signatures">
              <div style="height: 40px;"></div> <!-- Space for stamp -->
              <div class="sign-line">Authorized Signatory</div>
              <div style="font-size: 11px; margin-top: 4px;">For ${serviceCenter.name || "42 EV Tech"}</div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 15px;">
                Advisor: ${serviceAdvisor.name || "Service Advisor"}
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #9ca3af;">
            This is a computer generated document and does not require a physical signature.
            <br>Powered by 42 EV Tech DMS
          </div>
        </div>
      </body>
    </html>
    `;
}
