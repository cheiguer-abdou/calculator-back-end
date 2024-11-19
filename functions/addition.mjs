import { processOperation } from '../services/operation-service.mjs';

export const handler = async (event) => {
  const { user_id, num1, num2 } = JSON.parse(event.body);
  
  return await processOperation({
    operationType: 'addition',
    userId: user_id,
    num1: parseFloat(num1),
    num2: parseFloat(num2),
    operationFunc: (a, b) => a + b
  });
};