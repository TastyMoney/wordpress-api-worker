export function toJSON(data, status = 200) {
    let body = JSON.stringify(data, null, 2);
    let headers = { 'content-type': 'application/json' ,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"};
    return new Response(body, { headers, status });
}
export function toError(error, status = 400) {
    return toJSON({ error }, status);
}
export function reply(output) {
    if (output != null)
        return toJSON(output, 200);
    return toError('Error with query', 500);
}

export async function handlePaginatedRequest(collection, queryFilter, query) {
    const { page, pageSize } = parsePaginationParams(query);
    const data = await paginateQuery(collection, queryFilter, page, pageSize);
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    });
}

export function parsePaginationParams(query) {
    const page = parseInt(query.get('page'), 10);
    const pageSize = parseInt(query.get('pageSize'), 10);

    return {
        page: isNaN(page) ? 1 : page,
        pageSize: isNaN(pageSize) ? 10 : pageSize,
    };
}

async function paginateQuery(collection, query, page, pageSize) {
    const skip = (page - 1) * pageSize;

    const aggregationPipeline = [
        { $match: query },      
        { $skip: skip },         
        { $limit: pageSize }     
    ];

    const data = await collection.aggregate(aggregationPipeline);
    return data;
}