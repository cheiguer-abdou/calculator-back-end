import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const { RECORDS_TABLE } = process.env;

export const handler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    const { user_id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ message: "ID is required" }),
      };
    }

    // Define the parameters for the UpdateItemCommand
    const params = {
      TableName: RECORDS_TABLE,
      Key: {
        id: { S: id },
        user_id: { S: user_id }
      },
      UpdateExpression: "SET is_deleted = :true", // Soft delete flag
      ExpressionAttributeValues: {
        ":true": { BOOL: true },
      },
      ReturnValues: "ALL_NEW", // Return the updated item
    };

    // Create and send the UpdateItemCommand
    const command = new UpdateItemCommand(params);
    const result = await client.send(command);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        message: "Successfully soft deleted record",
        record: result.Attributes, // Return updated attributes of the record
      }),
    };
  } catch (error) {
    console.error("Error in soft delete:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        message: "Failed to soft delete record",
        error: error.message,
      }),
    };
  }
};
