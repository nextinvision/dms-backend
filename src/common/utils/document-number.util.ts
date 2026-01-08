import { PrismaService } from '../../database/prisma.service';

export interface DocumentNumberOptions {
    prefix: string; // Base prefix (e.g., "INV", "HS", "APT", or dynamic like SC code)
    fieldName: string; // Field name to search (e.g., "invoiceNumber", "serviceNumber")
    model: any; // Prisma model delegate (e.g., prisma.invoice, prisma.jobCard)
    sequenceLength?: number; // Number of digits for sequence (default: 4)
    includeMonth?: boolean; // Whether to include month in format (default: false)
    includeServiceCenterCode?: string; // Optional service center code to insert after prefix
}

/**
 * Generate a sequential document number with patterns:
 * - Simple: {PREFIX}-{YYYY}-{SEQ}
 * - With month: {PREFIX}-{YYYY}-{MM}-{SEQ}
 * - With SC code: {PREFIX}-{SCCODE}-{YYYY}-{SEQ}
 * - With SC code and month: {PREFIX}-{SCCODE}-{YYYY}-{MM}-{SEQ}
 * 
 * Examples:
 * - INV-SC01-2024-0001 (invoice with SC code)
 * - HS-SC01-2024-0001 (home service with SC code)
 * - APT-2024-01-0001 (appointment with month)
 * - QTN-2024-0001 (quotation without month)
 */
export async function generateDocumentNumber(
    prisma: PrismaService,
    options: DocumentNumberOptions
): Promise<string> {
    const { 
        prefix, 
        fieldName, 
        model, 
        sequenceLength = 4, 
        includeMonth = false,
        includeServiceCenterCode
    } = options;

    const now = new Date();
    const year = now.getFullYear();
    const month = includeMonth ? (now.getMonth() + 1).toString().padStart(2, '0') : null;

    // Build prefix: PREFIX[-SCCODE]-[YYYY]-[MM]-
    let fullPrefix = prefix;
    if (includeServiceCenterCode) {
        fullPrefix = `${prefix}-${includeServiceCenterCode}`;
    }
    if (month) {
        fullPrefix = `${fullPrefix}-${year}-${month}-`;
    } else {
        fullPrefix = `${fullPrefix}-${year}-`;
    }

    // Find last document with matching prefix
    const lastDocument = await model.findFirst({
        where: {
            [fieldName]: { startsWith: fullPrefix },
        },
        orderBy: { [fieldName]: 'desc' },
    });

    let seq = 1;
    if (lastDocument) {
        const parts = lastDocument[fieldName].split('-');
        // Get last part as sequence number
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) {
            seq = lastSeq + 1;
        }
    }

    return `${fullPrefix}${seq.toString().padStart(sequenceLength, '0')}`;
}

/**
 * Generate a simple sequential number without date components.
 * Pattern: {PREFIX}-{SEQ}
 * Example: CUST-0001
 */
export async function generateSimpleDocumentNumber(
    prisma: PrismaService,
    prefix: string,
    fieldName: string,
    model: any,
    sequenceLength: number = 4
): Promise<string> {
    const lastDocument = await model.findFirst({
        orderBy: { [fieldName]: 'desc' },
    });

    let seq = 1;
    if (lastDocument && lastDocument[fieldName].startsWith(`${prefix}-`)) {
        const parts = lastDocument[fieldName].split('-');
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) {
            seq = lastSeq + 1;
        }
    }

    return `${prefix}-${seq.toString().padStart(sequenceLength, '0')}`;
}
