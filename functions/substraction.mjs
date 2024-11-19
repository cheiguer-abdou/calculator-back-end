import { processOperation } from '../services/operation-service.mjs';

export const handler = async (event) => {
  const { num1, num2, user_id: userId } = JSON.parse(event.body);
  
  return await processOperation({
    operationType: 'subtraction',
    userId,
    num1: parseFloat(num1),
    num2: parseFloat(num2),
    operationFunc: (a, b) => a - b
  });
};