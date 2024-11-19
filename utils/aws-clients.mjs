import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

export const dynamodb = new DynamoDBClient();
export const cognito = new CognitoIdentityProviderClient();