import { processOperation } from '../services/operation-service.mjs';

export const handler = async (event) => {
  const { num1, num2, user_id: userId } = JSON.parse(event.body);
  const divisor = parseFloat(num2);
  
  if (divisor === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Division by zero is not allowed' })
    };
  }

  return await processOperation({
    operationType: 'division',
    userId,
    num1: parseFloat(num1),
    num2: divisor,
    operationFunc: (a, b) => a / b
  });
};