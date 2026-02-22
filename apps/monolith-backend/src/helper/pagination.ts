export function paginate<T>(data: T[], page: number, limit: number) {
    const start = (page - 1) * limit;
    return data.slice(start, start + limit);
}
