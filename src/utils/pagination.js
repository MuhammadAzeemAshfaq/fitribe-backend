/**
 * Pagination Utility
 * Helper functions for paginated responses
 */

// ==================== PAGINATE FIRESTORE QUERY ====================
async function paginateQuery(query, options = {}) {
  const {
    limit = 20,
    page = 1,
    orderByField = 'createdAt',
    orderDirection = 'desc'
  } = options;
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  // Apply ordering
  let paginatedQuery = query.orderBy(orderByField, orderDirection);
  
  // Get total count (expensive operation, consider caching)
  const allDocs = await query.get();
  const totalCount = allDocs.size;
  
  // Apply pagination
  paginatedQuery = paginatedQuery.limit(limit).offset(offset);
  
  // Execute query
  const snapshot = await paginatedQuery.get();
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  };
}

// ==================== PAGINATE ARRAY ====================
function paginateArray(array, options = {}) {
  const {
    limit = 20,
    page = 1
  } = options;
  
  const totalCount = array.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  
  const data = array.slice(offset, offset + limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

// ==================== CURSOR-BASED PAGINATION ====================
async function cursorPaginate(query, options = {}) {
  const {
    limit = 20,
    cursor = null, // Last document ID from previous page
    orderByField = 'createdAt',
    orderDirection = 'desc'
  } = options;
  
  let paginatedQuery = query.orderBy(orderByField, orderDirection).limit(limit + 1);
  
  // If cursor provided, start after that document
  if (cursor) {
    const cursorDoc = await query.doc(cursor).get();
    if (cursorDoc.exists) {
      paginatedQuery = paginatedQuery.startAfter(cursorDoc);
    }
  }
  
  const snapshot = await paginatedQuery.get();
  const docs = snapshot.docs;
  
  // Check if there are more results
  const hasNextPage = docs.length > limit;
  
  // Remove the extra document used for hasNextPage check
  const data = docs.slice(0, limit).map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Get the cursor for next page (last document ID)
  const nextCursor = data.length > 0 ? data[data.length - 1].id : null;
  
  return {
    data,
    pagination: {
      limit,
      hasNextPage,
      nextCursor
    }
  };
}

// ==================== BUILD PAGINATION RESPONSE ====================
function buildPaginationResponse(data, pagination) {
  return {
    success: true,
    data,
    pagination
  };
}

// ==================== GET PAGINATION PARAMS ====================
function getPaginationParams(query) {
  return {
    limit: parseInt(query.limit) || 20,
    page: parseInt(query.page) || 1,
    cursor: query.cursor || null
  };
}

// ==================== VALIDATE PAGINATION PARAMS ====================
function validatePaginationParams(params) {
  const errors = [];
  
  if (params.limit < 1 || params.limit > 100) {
    errors.push('limit must be between 1 and 100');
  }
  
  if (params.page < 1) {
    errors.push('page must be 1 or greater');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  paginateQuery,
  paginateArray,
  cursorPaginate,
  buildPaginationResponse,
  getPaginationParams,
  validatePaginationParams
};