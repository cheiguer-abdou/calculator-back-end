import { 
    AdminGetUserCommand,
    AdminUpdateUserAttributesCommand 
  } from "@aws-sdk/client-cognito-identity-provider";
  import { cognito } from '../utils/aws-clients.mjs';
  const { USER_POOL_ID } = process.env;
  
  export const getUserBalance = async (userId) => {
    try {
      const params = {
        UserPoolId: USER_POOL_ID,
        Username: userId
      };
  
      const command = new AdminGetUserCommand(params);
      const { UserAttributes } = await cognito.send(command);
      
      const balanceAttribute = UserAttributes.find(
        ({ Name }) => Name === 'custom:balance'
      );
      
      return balanceAttribute ? parseFloat(balanceAttribute.Value) : 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw new Error(`Failed to get user balance ${userId}`);
    }
  };
  
  export const updateUserBalance = async (userId, newBalance) => {
    try {
      const params = {
        UserPoolId: USER_POOL_ID,
        Username: userId,
        UserAttributes: [
          {
            Name: 'custom:balance',
            Value: newBalance.toString()
          }
        ]
      };
  
      const command = new AdminUpdateUserAttributesCommand(params);
      await cognito.send(command);
    } catch (error) {
      console.error('Error updating user balance:', error);
      throw new Error('Failed to update user balance');
    }
  };