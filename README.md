# calculator-back-end


### Project Deployment Guide ###
## Prerequisites ##

- **Node.js installed**
- **AWS account configured**
- **Serverless Framework installed globally**

## Project setup
```
npm install
```

## Local Development ##
To run the project locally:
```
npm run local
```

## Deployment to AWS ##
Backend Deployment:
```
npm run deploy
```

## Frontend Deployment ##

### Update the endpoint configuration:
  - **Open the frontend configuration file**
  - **Modify VUE_APP_ENDPOINT to match your backend endpoint URL**


### Deploy frontend to S3:
```
# Build the project
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name

# Set up Amplify or CloudFront for hosting
```

## Removing Deployment ##
**To remove the entire serverless deployment from AWS:**
```
npx serverless remove
```
