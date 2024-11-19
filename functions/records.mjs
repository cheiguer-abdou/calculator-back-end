import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDBClient();
const { OPERATIONS_TABLE, RECORDS_TABLE } = process.env;

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE = 1;

// Helper function to safely access DynamoDB attributes
const getDBValue = (record, path) => {
  try {
    return path.split('.').reduce((obj, key) => obj?.[key], record) || null;
  } catch (error) {
    console.warn(`Failed to get value for path ${path}:`, error);
    return null;
  }
};

// Helper function to enrich records with operation details
const enrichRecords = async (records, dynamodb, OPERATIONS_TABLE) => {
  console.log('Starting enrichment for records:',
    records.map(r => ({
      id: getDBValue(r, 'id.S'),
      operation_id: getDBValue(r, 'operation_id.S')
    }))
  );

  return await Promise.all(
    records.map(async (record) => {
      try {
        const operationId = getDBValue(record, 'operation_id.S');

        if (!operationId) {
          console.warn('Missing operation_id for record:', getDBValue(record, 'id.S'));
          return {
            id: getDBValue(record, 'id.S'),
            operation_type: null,
            amount: getDBValue(record, 'amount.N'),
            user_balance: getDBValue(record, 'user_balance.N'),
            operation_response: getDBValue(record, 'operation_response.S'),
            date: getDBValue(record, 'date.S'),
          };
        }

        const operationQuery = new QueryCommand({
          TableName: OPERATIONS_TABLE,
          KeyConditionExpression: "id = :id",
          ExpressionAttributeValues: {
            ":id": { S: operationId }
          }
        });

        console.log('Querying operation:', operationId);
        
        const operationResult = await dynamodb.send(operationQuery);
        const operation = operationResult.Items?.[0];

        console.log('Operation result:', {
          operationId,
          found: !!operation,
          type: getDBValue(operation, 'type.S')
        });

        return {
          id: getDBValue(record, 'id.S'),
          operation_type: getDBValue(operation, 'type.S'),
          amount: getDBValue(record, 'amount.N'),
          user_balance: getDBValue(record, 'user_balance.N'),
          operation_response: getDBValue(record, 'operation_response.S'),
          date: getDBValue(record, 'date.S'),
        };

      } catch (error) {
        console.error('Error enriching record:', {
          recordId: getDBValue(record, 'id.S'),
          error: error.message
        });
        
        return {
          id: getDBValue(record, 'id.S'),
          operation_type: null,
          amount: getDBValue(record, 'amount.N'),
          user_balance: getDBValue(record, 'user_balance.N'),
          operation_response: getDBValue(record, 'operation_response.S'),
          date: getDBValue(record, 'date.S'),
          error: 'Failed to enrich record'
        };
      }
    })
  );
};

export const handler = async (event) => {
  // Log incoming event
  console.log('Incoming event:', JSON.stringify(event, null, 2));
  console.log('Environment variables:', { OPERATIONS_TABLE, RECORDS_TABLE });

  const queryParams = event.queryStringParameters || {};

  // Extract parameters
  const user_id = queryParams.user_id;
  const filterAmount = queryParams.filter_amount;
  const filterOperationType = queryParams.filter_operation_type;

  console.log('Query parameters:', {
    user_id,
    filterAmount,
    filterOperationType,
    queryParams
  });

  // Sort always defaults to descending (newest first)
  const sort = {
    field: "date",
    order: queryParams["sort[order]"] && 
           queryParams["sort[order]"].toLowerCase() === 'asc' 
      ? 'asc' 
      : "desc", // Default to desc (newest first)
  };

  const page = queryParams.page ? parseInt(queryParams.page, 10) : DEFAULT_PAGE;
  const per_page = queryParams.per_page 
    ? Math.min(parseInt(queryParams.per_page, 10), 100) // Limit max per_page to 100
    : DEFAULT_PAGE_SIZE;

  if (!user_id) {
    console.log('Missing user_id in request');
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: "Missing 'user_id' in the request" })
    };
  }

  try {
    // Build filter expressions for the query
    const filterExpressions = ["is_deleted = :is_deleted"];
    const expressionAttributeValues = {
      ":user_id": { S: user_id },
      ":is_deleted": { BOOL: false } // Only select records where is_deleted is false
    };
    const expressionAttributeNames = {};

    // Amount partial search
    if (filterAmount) {
      filterExpressions.push("contains(amount_str, :amount)");
      expressionAttributeValues[":amount"] = { S: filterAmount.toString() };
    }

    // Prepare DynamoDB query parameters
    const dynamoQueryParams = {
      TableName: RECORDS_TABLE,
      IndexName: "user_id-index",
      KeyConditionExpression: "user_id = :user_id",
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames }),
      ...(filterExpressions.length > 0 && { FilterExpression: filterExpressions.join(" AND ") }),
      ScanIndexForward: sort.order === "asc" // This ensures DynamoDB query respects sort order
    };

    console.log('DynamoDB Query Parameters:', JSON.stringify(dynamoQueryParams, null, 2));

    // Execute initial query
    const queryCommand = new QueryCommand(dynamoQueryParams);
    const { Items: records = [], Count: totalRecords } = await dynamodb.send(queryCommand);

    console.log('Initial query results:', {
      recordCount: records.length,
      totalRecords
    });

    // Early return for empty results
    if (!records.length) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({
          data: [],
          pagination: {
            total: 0,
            per_page,
            current_page: page,
            total_pages: 0,
          },
        }),
      };
    }

    // Enrich records with operation details
    const enrichedRecords = await enrichRecords(records, dynamodb, OPERATIONS_TABLE);
    console.log('Records enriched successfully');

    // Apply operation type filter if specified
    let filteredRecords = enrichedRecords;
    if (filterOperationType) {
      filteredRecords = enrichedRecords.filter((record) => {
        const operationType = record.operation_type?.toLowerCase();
        const filterType = filterOperationType.toLowerCase();
        return operationType?.includes(filterType);
      });
    }

    // Sort records by date (newest first by default)
    const sortedRecords = filteredRecords.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      
      return sort.order === 'asc' 
        ? dateA - dateB 
        : dateB - dateA;
    });

    // Apply pagination
    const totalPages = Math.ceil(sortedRecords.length / per_page);
    const startIndex = (page - 1) * per_page;
    const paginatedRecords = sortedRecords.slice(startIndex, startIndex + per_page);

    console.log('Final response preparation:', {
      totalRecords: sortedRecords.length,
      paginatedCount: paginatedRecords.length,
      totalPages,
      currentPage: page
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        data: paginatedRecords,
        pagination: {
          total: sortedRecords.length,
          per_page,
          current_page: page,
          total_pages: totalPages,
        },
      }),
    };
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        error: "Error fetching records",
        details: error.message,
      }),
    };
  }
};