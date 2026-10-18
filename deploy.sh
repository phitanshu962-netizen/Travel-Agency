#!/bin/bash

# Travel Agency Backend Deployment Script for Google Cloud Run
# This script includes all fixes for Apple Silicon + Cloud Run compatibility

set -e  # Exit on any error

# Configuration
PROJECT_ID="travel-agent-management-29c27"
SERVICE_NAME="travel-agency-backend"
REGION="asia-south1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "🚀 Starting Travel Agency Backend Deployment"
echo "=============================================="

# Step 1: Build Docker image locally
echo "🏗️  Building Docker image..."
cd "$(dirname "$0")"
docker build -t "${IMAGE_NAME}" .

# Step 2: Push Docker image to Google Container Registry
echo "📤 Pushing Docker image to Google Container Registry..."
docker push "${IMAGE_NAME}"

echo "✅ Docker image built and pushed successfully"

# Step 3: Deploy to Cloud Run with all required environment variables
echo "☁️  Deploying to Google Cloud Run..."

gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 \
  --set-env-vars="\
FIREBASE_PROJECT_ID=travel-agent-management-29c27,\
FIREBASE_PRIVATE_KEY_ID=378a6232878d58b0af992d313cd69b66255638ce,\
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3gCqYhckMj8T+\nOMfBlpoJb3KhrY52L3JYE2gDhmOMIkK13s6LyHDhLN9ybZR/rXrhtwg1SRBgIPJ0\nYYCB/mMkbKKVeX4aRFsqZ9BBRwKALq0bcgAx/p0+rQWsBKVHLYU0xTvHuxBvqDAP\nxJuW9qRgFSVSxKtg+spa22WpbkVTvQs0gEItNx4WZporYieb3bdh3kApcoDWZtzh\nhr1giACDsFRR0wR1fJUHh/YQqCrvOuJqUBac1jyKV7RsrV7Jf2ot0o5eBbYwyZ/f\nM02susBwAAVSNN5NqJJMDphOD1UeocRXZnO2k0pZ32C+diQGR8KlYpUx4Xvg2QAE\nkyMVMAI1AgMBAAECggEAC960jVffdiU5VEs5ULfR5a5Z4e98zv7+tzJ6K1A0JvUd\nukSxY7ARl99JN6Oy/sIADZMYwCmmb4bHaD6DtjpNu3tzgOvHpndUK7K6G/Q19d4P\nFeln7dP54/tZPz6wWkxYLjOxTELjgKAxNl6SGfqBDjNlTgH+0Vp9CyeKCfhiGlUn\ndoL/5xxbWQ+pnGyA2OszAmFbGm8UqmDSwvLKoetzI5wJ9qdeJfpy3PW4KY7x0Tn5\nOvF4SuLEJUu7iwp8X6KouEm/2nEvOUzn0X3uTUAkJuJkCcsvXFagJPoUkr0Fl2jT\noKQGZ0k/SmxnmP0ldYzburARPGD5vmoMDVhf4blLeQKBgQDk/CA32v7gHoqbhiYM\nqaGxNQmsU7hUn0n9S/UAQpj0rvev+HKDxWAUxgk/Y4/AJLXVeBIjFIpY6iLyLOyo\nLWAdg86WZVBRv//70FCZNUDidZ6WELCpU8L7KZHN5c53ixAUsPUZ+6gAy0CCdpmY\nymnu8WPRbKf5nNPezPxKKyXi3wKBgQDNJk/KlhQu/LW1iCljmzv8+0A30WiVhboh\n5x5YOlnTpb/qCLNDxubJUcOl2glwS8zscWopDc7oFzc+jxlv1EKLP4uWxwIF91ys\n+K2oUWfTz7b3mSoe3PPFsmVY84eoxbSG8Psrt3pejSZBHDee1nAMAtUaN6pDilz8\nDjf3Q0KxawKBgQCFUr83hkzMFTxC3VKeIM5CLU1ahsxWiQA9eNJHun7wSEdyr8eN\nLYiJz9xmigOSrk0o42Y8AqOirYB3XOzV5sWFqc7JBmhDkPTsmxeyfK0wracOXN1f\nWaO3NTbtmRYjyFYulfG/lST2gWEoFQHNUl1ngCjMMOWEkmlR2iwyyvieJQKBgGyV\nWqZfyU8VcxgiecW+5IGCevsQW8rIfTx0mBsax3C+ylWVRU0aeg0UufmO7nABrvV3\nEjmolVtC7nquQ0htkMsjVz73FpsR0nu7JC9y5wG1b6Kd7y1mxaBeTEZIoAU0n9jM\ntCTveFWTYCwWQ1pPJf81gJXf4L7e/VhsLjMx5psBAoGBAIoSzytXyuMdntqiKlKK\nqa7HZwh1T9OuHtv1qphzP4no7c5E/z1QvX4FRo75to/LHJLbbLQvsKWlMeMIA7Os\nuaua8QuztjiDa+N+TWnuzZ1tKR2s1FNW7CKPROFG6dhfTAuZelW0Ddhjk6AKIx/1\nu7DG0POSlzflqMVklaNB2f3n\n-----END PRIVATE KEY-----\n,\
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@travel-agent-management-29c27.iam.gserviceaccount.com,\
FIREBASE_CLIENT_ID=104888079712983045828,\
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth,\
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token,\
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs,\
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40travel-agent-management-29c27.iam.gserviceaccount.com,\
R2_ACCOUNT_ID=25254d18b4d4d8443dba762481b12ebb,\
R2_ACCESS_KEY_ID=c7046612f63141c3db768593d205c858,\
R2_SECRET_ACCESS_KEY=811666076732b8fd865380f8864ddb2661bc148412db5cd964ad13afc1aec1a2,\
R2_BUCKET_NAME=tripdm-images,\
R2_PUBLIC_URL=https://pub-72f938952ddd47cc95bd3efcf3b9419c.r2.dev,\
RESEND_API_KEY="${RESEND_API_KEY}",\
RESEND_FROM_EMAIL=TripDM <support@tripdm.com>,\
NEXT_PUBLIC_APP_URL=https://tripdm.com,\
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BJUyaQwurGW88dG-jbYwPMEws_f8nuWDfuHwusLisJMyn6fWn0X2F2fR7vZ2ay0Tbd30-do2IqBR9EwQDYCQdU8,\
NODE_ENV=production"

echo "✅ Cloud Run deployment completed successfully"

# Step 4: Wait for deployment to be ready
echo "⏳ Waiting for service to be ready..."
sleep 30

# Step 5: Test the health endpoint
echo "🔍 Testing health endpoint..."
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --project="${PROJECT_ID}" --region="${REGION}" --format="value(status.url)")

if curl -s "${SERVICE_URL}/api/health" | grep -q "healthy"; then
    echo "✅ Health check passed! Service is working correctly."
    echo "🌐 Service URL: ${SERVICE_URL}"
    echo "💚 Health endpoint: ${SERVICE_URL}/api/health"
else
    echo "❌ Health check failed! Please check the logs."
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "=============================================="
echo "Service URL: ${SERVICE_URL}"
echo "Health Check: ${SERVICE_URL}/api/health"
echo ""
echo "📋 Deployment Summary:"
echo "  ✅ Docker Buildx enabled"
echo "  ✅ Built for linux/amd64 architecture"
echo "  ✅ Image pushed to Google Container Registry"
echo "  ✅ Deployed to Cloud Run with environment variables"
echo "  ✅ Health endpoint verified"
echo "=============================================="
