import { processOperation } from '../services/operation-service.mjs';
import https from 'https';

export const handler = async (event) => {
  const { userId } = JSON.parse(event.body);
  return await processOperation({
    operationType: 'random_string',
    userId,
    operationFunc: async () => {
      return new Promise((resolve, reject) => {
        https.get('https://www.random.org/strings/?num=1&len=8&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain&rnd=new', (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              resolve(data.trim());
            } catch (error) {
              reject(new Error('Failed to process random string'));
            }
          });
        }).on('error', (error) => {
          console.error('Error fetching random string:', error);
          reject(new Error('Failed to generate random string'));
        });
      });
    }
  });
};