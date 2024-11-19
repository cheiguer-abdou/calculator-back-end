import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { dynamodb } from '../utils/aws-clients.mjs';
import { OPERATION_COSTS } from '../utils/constants.mjs';
import { getUserBalance, updateUserBalance } from './user-service.mjs';

const getOperationCost = operationType => OPERATION_COSTS[operationType] || 0;

const generateId = (prefix, userId) => {
  const timestamp = new Date().toISOString();
  return `${prefix}_${timestamp}_${userId}`;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const saveOperationRecord = async ({
  userId,
  operationType,
  amount,
  userBalance,
  operationResponse
}) => {
  try {
    const operationId = generateId('op', userId);
    const operationItem = {
      TableName: 'operations',
      Item: marshall({
        id: operationId,
        type: operationType,
        cost: getOperationCost(operationType)
      })
    };
    const recordItem = {
      TableName: 'records',
      Item: marshall({
        id: generateId('rec', userId),
        operation_id: operationId,
        user_id: userId,
        amount,
        user_balance: userBalance,
        operation_response: operationResponse,
        is_deleted: false,
        date: new Date().toISOString()
      })
    };
    await Promise.all([
      dynamodb.send(new PutItemCommand(operationItem)),
      dynamodb.send(new PutItemCommand(recordItem))
    ]);
    
    return operationId;
  } catch (error) {
    console.error('Error saving operation record:', error);
    throw new Error('Failed to save operation record');
  }
};

export const processOperation = async ({
  operationType,
  userId,
  num1,
  num2,
  operationFunc
}) => {
  try {
    const cost = getOperationCost(operationType);
    const userBalance = await getUserBalance(userId);
    
    if (userBalance < cost) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Insufficient balance',
          required: cost,
          current_balance: userBalance
        })
      };
    }

    let result;
    let amount;

    if (operationType === 'random_string') {
      result = await operationFunc();
      amount = cost; // For random string, use the cost as amount
    } else {
      result = operationFunc(num1, num2);
      amount = result; // For arithmetic operations, use the result as amount
    }

    const newBalance = userBalance - cost;
    await updateUserBalance(userId, newBalance);
    
    const operationId = await saveOperationRecord({
      userId,
      operationType,
      amount,
      userBalance: newBalance,
      operationResponse: result.toString()
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        operation_id: operationId,
        result,
        cost,
        remaining_balance: newBalance
      })
    };
  } catch (error) {
    console.error('Error processing operation:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};