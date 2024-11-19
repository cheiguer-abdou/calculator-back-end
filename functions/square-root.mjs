import { processOperation } from '../services/operation-service.mjs';

export const handler = async (event) => {
  const { num1, user_id: userId } = JSON.parse(event.body);
  const number = parseFloat(num1);
  
  if (number < 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Square root of negative number is not allowed' })
    };
  }

  return await processOperation({
    operationType: 'square_root',
    userId,
    num1: number,
    num2: null,
    operationFunc: a => Math.sqrt(a)
  });
};