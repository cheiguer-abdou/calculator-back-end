import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

export const handler = async (event) => {
    // Early return if not a new user confirmation
    console.log(event)
    if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
        return event;
    }

    try {
        const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
        const { userPoolId, userName } = event;

        // Define user attributes update
        const params = {
            UserAttributes: [
                {
                    Name: 'custom:balance',
                    Value: '100'
                }
            ],
            UserPoolId: userPoolId,
            Username: userName
        };

        // Update user attributes using the command pattern
        const command = new AdminUpdateUserAttributesCommand(params);
        await client.send(command);
        
        return event;
    } catch (error) {
        console.error('Error setting initial balance:', error);
        throw error;
    }
};