import { PaginatedResult, PaginationMeta } from '../dto/pagination.dto';

/**
 * Create paginated response with metadata
 */
export function paginate<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };

    return {
        data,
        meta,
    };
}

/**
 * Calculate skip value for database queries
 */
export function calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
}

/**
 * Build order by clause from sort parameters
 */
export function buildOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
): Record<string, 'asc' | 'desc'> {
    if (!sortBy) {
        return { createdAt: 'desc' };
    }
    return { [sortBy]: sortOrder };
}
