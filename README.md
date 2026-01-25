This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Firebase Project Setup Checklist

Before deploying, ensure your Firebase project is properly configured:

### 1. Authentication Settings
- Go to Firebase Console → Authentication → Sign-in method
- Enable Email/Password authentication
- Enable Google authentication
- Add your production domain to authorized domains: `https://travel-agent-management-29c27.web.app`

### 2. Firestore Database
- Create a Firestore database in production mode
- Security rules are configured in `firestore.rules`

### 3. Storage (if using file uploads)
- Enable Firebase Storage
- Configure storage rules in `storage.rules`

### 4. Environment Variables
- Copy `.env.example` to `.env`
- Fill in all required Firebase configuration values
- Ensure `NEXT_PUBLIC_API_URL` points to your Cloud Run service URL

## Deployment

1. **Deploy Backend (Cloud Run)**:
   ```bash
   cd TravelAgency/Untitled
   ./deploy.sh
   ```

2. **Update Frontend Environment**:
   - Update `NEXT_PUBLIC_API_URL` in `.env` with the Cloud Run service URL
   - Update `NEXT_PUBLIC_ADMIN_EMAIL` if needed

3. **Deploy Frontend (Firebase Hosting)**:
   ```bash
   firebase deploy --only hosting
   ```

## Troubleshooting

- If authentication fails, check browser console for detailed error messages
- Verify all environment variables are set correctly
- Ensure Firebase project has proper permissions
- Check that Firestore security rules allow authenticated access

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
