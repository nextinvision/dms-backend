/**
 * Report HTML Template Generator
 * Generates HTML for different report types to be converted to PDF
 */

interface ReportTemplateData {
    reportType: string;
    reportData: any;
    serviceCenterName: string;
    dateRange: { from: string; to: string };
}

export function generateReportHtmlTemplate(data: ReportTemplateData): string {
    const { reportType, reportData, serviceCenterName, dateRange } = data;

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };

    let reportContent = '';

    switch (reportType) {
        case 'sales':
            reportContent = generateSalesReportHtml(reportData, formatCurrency);
            break;
        case 'service-volume':
            reportContent = generateServiceVolumeReportHtml(reportData);
            break;
        case 'technician-performance':
            reportContent = generateTechnicianPerformanceReportHtml(reportData);
            break;
        case 'inventory':
            reportContent = generateInventoryReportHtml(reportData, formatCurrency);
            break;
        default:
            reportContent = '<p>Report type not supported</p>';
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${getReportTitle(reportType)} - ${serviceCenterName}</title>
    <style>
        @media print {
            @page {
                margin: 1.2cm;
                size: A4;
            }
            body { margin: 0; padding: 0; }
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            color: #1f2937;
            line-height: 1.6;
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header-title {
            font-size: 28px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 8px;
        }
        .header-subtitle {
            font-size: 14px;
            color: #6b7280;
        }
        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f9fafb;
            border-radius: 8px;
        }
        .info-item {
            font-size: 13px;
        }
        .info-label {
            font-weight: 600;
            color: #374151;
        }
        .info-value {
            color: #111827;
            margin-top: 4px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
        }
        th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        tr:hover {
            background-color: #f9fafb;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        .badge-success {
            background-color: #d1fae5;
            color: #065f46;
        }
        .badge-warning {
            background-color: #fef3c7;
            color: #92400e;
        }
        .badge-danger {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .badge-info {
            background-color: #dbeafe;
            color: #1e40af;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            margin: 30px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-title">${getReportTitle(reportType)}</div>
        <div class="header-subtitle">${serviceCenterName}</div>
    </div>

    <div class="info-section">
        <div class="info-item">
            <div class="info-label">Service Center</div>
            <div class="info-value">${serviceCenterName}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Date Range</div>
            <div class="info-value">${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Generated On</div>
            <div class="info-value">${new Date().toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })}</div>
        </div>
    </div>

    ${reportContent}

    <div class="footer">
        <p>This report was generated automatically by the Dealer Management System</p>
        <p>© ${new Date().getFullYear()} All rights reserved</p>
    </div>
</body>
</html>
    `;
}

function getReportTitle(reportType: string): string {
    const titles: { [key: string]: string } = {
        sales: 'Sales Report',
        'service-volume': 'Service Volume Report',
        'technician-performance': 'Technician Performance Report',
        inventory: 'Inventory Report',
    };
    return titles[reportType] || 'Report';
}

function generateSalesReportHtml(reportData: any, formatCurrency: (n: number) => string): string {
    if (!reportData.sales) return '<p>No sales data available</p>';

    const { totalRevenue, totalInvoices, avgInvoiceValue, revenueByMonth } = reportData.sales;

    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Revenue</div>
                <div class="stat-value">${formatCurrency(totalRevenue)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Invoices</div>
                <div class="stat-value">${totalInvoices}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Invoice Value</div>
                <div class="stat-value">${formatCurrency(Math.round(avgInvoiceValue))}</div>
            </div>
        </div>

        ${revenueByMonth && revenueByMonth.length > 0 ? `
            <div class="section-title">Revenue by Month</div>
            <table>
                <thead>
                    <tr>
                        <th>Month</th>
                        <th style="text-align: right;">Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${revenueByMonth.map((item: any) => `
                        <tr>
                            <td>${item.month}</td>
                            <td style="text-align: right;">${formatCurrency(item.revenue)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}
    `;
}

function generateServiceVolumeReportHtml(reportData: any): string {
    if (!reportData.serviceVolume) return '<p>No service volume data available</p>';

    const { totalJobCards, completed, inProgress, pending, avgCompletionTime } = reportData.serviceVolume;

    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Job Cards</div>
                <div class="stat-value">${totalJobCards}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Completed</div>
                <div class="stat-value">${completed}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">In Progress</div>
                <div class="stat-value">${inProgress}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pending</div>
                <div class="stat-value">${pending}</div>
            </div>
        </div>

        <div class="section-title">Performance Metrics</div>
        <div class="info-section">
            <div class="info-item">
                <div class="info-label">Average Completion Time</div>
                <div class="info-value" style="font-size: 18px; font-weight: bold;">${avgCompletionTime}</div>
            </div>
        </div>
    `;
}

function generateTechnicianPerformanceReportHtml(reportData: any): string {
    if (!reportData.technicianPerformance || !reportData.technicianPerformance.technicians) {
        return '<p>No technician performance data available</p>';
    }

    const { technicians } = reportData.technicianPerformance;

    return `
        <div class="section-title">Technician Performance</div>
        <table>
            <thead>
                <tr>
                    <th>Technician Name</th>
                    <th style="text-align: center;">Completed Jobs</th>
                    <th style="text-align: center;">Avg Rating</th>
                    <th style="text-align: center;">Efficiency</th>
                </tr>
            </thead>
            <tbody>
                ${technicians.map((tech: any) => {
                    const efficiencyClass = tech.efficiency >= 80 ? 'badge-success' : 
                                           tech.efficiency >= 60 ? 'badge-warning' : 'badge-danger';
                    return `
                        <tr>
                            <td>${tech.name}</td>
                            <td style="text-align: center;">${tech.completedJobs}</td>
                            <td style="text-align: center;">${tech.avgRating.toFixed(1)}</td>
                            <td style="text-align: center;">
                                <span class="badge ${efficiencyClass}">${tech.efficiency}%</span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function generateInventoryReportHtml(reportData: any, formatCurrency: (n: number) => string): string {
    if (!reportData.inventory) return '<p>No inventory data available</p>';

    const { totalParts, lowStockCount, totalValue, topMovingParts, lowMovingParts, allParts } = reportData.inventory;

    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Parts</div>
                <div class="stat-value">${totalParts}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Low Stock Items</div>
                <div class="stat-value">${lowStockCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Inventory Value</div>
                <div class="stat-value">${formatCurrency(totalValue)}</div>
            </div>
        </div>

        ${topMovingParts && topMovingParts.length > 0 ? `
            <div class="section-title">Top Moving Parts (Most Used)</div>
            <table>
                <thead>
                    <tr>
                        <th>Part Name</th>
                        <th style="text-align: center;">Stock Qty</th>
                        <th style="text-align: center;">Usage Count</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${topMovingParts.map((part: any) => `
                        <tr>
                            <td>${part.name}</td>
                            <td style="text-align: center;">${part.quantity}</td>
                            <td style="text-align: center;"><span class="badge badge-success">${part.usageCount}</span></td>
                            <td style="text-align: right;">${formatCurrency(part.price)}</td>
                            <td style="text-align: right;">${formatCurrency(part.value)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}

        ${lowMovingParts && lowMovingParts.length > 0 ? `
            <div class="section-title">Low Moving Parts (Rarely Used)</div>
            <table>
                <thead>
                    <tr>
                        <th>Part Name</th>
                        <th style="text-align: center;">Stock Qty</th>
                        <th style="text-align: center;">Usage Count</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${lowMovingParts.map((part: any) => {
                        const usageClass = part.usageCount === 0 ? 'badge-danger' : 'badge-warning';
                        return `
                            <tr>
                                <td>${part.name}</td>
                                <td style="text-align: center;">${part.quantity}</td>
                                <td style="text-align: center;"><span class="badge ${usageClass}">${part.usageCount}</span></td>
                                <td style="text-align: right;">${formatCurrency(part.price)}</td>
                                <td style="text-align: right;">${formatCurrency(part.value)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        ` : ''}

        ${allParts && allParts.length > 0 ? `
            <div class="section-title">All Parts (${allParts.length})</div>
            <table>
                <thead>
                    <tr>
                        <th>Part Name</th>
                        <th>Part Number</th>
                        <th>Category</th>
                        <th style="text-align: center;">Stock Qty</th>
                        <th style="text-align: center;">Min Level</th>
                        <th style="text-align: center;">Usage</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total Value</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${allParts.slice(0, 50).map((part: any) => {
                        const statusClass = part.status === 'Out of Stock' ? 'badge-danger' :
                                         part.status === 'Low Stock' ? 'badge-warning' : 'badge-success';
                        return `
                            <tr>
                                <td>${part.name}</td>
                                <td>${part.partNumber}</td>
                                <td>${part.category}</td>
                                <td style="text-align: center;">${part.quantity}</td>
                                <td style="text-align: center;">${part.minStockLevel || '-'}</td>
                                <td style="text-align: center;">${part.usageCount > 0 ? `<span class="badge badge-info">${part.usageCount}</span>` : '0'}</td>
                                <td style="text-align: right;">${formatCurrency(part.price)}</td>
                                <td style="text-align: right;">${formatCurrency(part.value)}</td>
                                <td style="text-align: center;"><span class="badge ${statusClass}">${part.status}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            ${allParts.length > 50 ? `<p style="text-align: center; color: #6b7280; margin-top: 10px;">Showing first 50 of ${allParts.length} parts</p>` : ''}
        ` : ''}
    `;
}

