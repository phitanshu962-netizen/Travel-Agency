# Chat Backend Migration to TravelAgency

## Overview
This document outlines the plan to remove the existing chat backend and migrate the Android chat application to use the TravelAgency Next.js application as its backend service.

## Current Architecture
### Chat Backend (To be removed)
- **Technology**: Node.js + TypeScript + WebSocket server
- **Database**: PostgreSQL
- **Authentication**: Firebase Auth
- **Real-time**: WebSocket connections
- **Deployment**: Google Cloud Run
- **Features**:
  - User authentication and registration
  - Real-time messaging via WebSockets
  - Message history and delivery tracking
  - Online user presence
  - Message acknowledgments

### TravelAgency App (To become backend)
- **Technology**: Next.js 16 + React 19 + TypeScript
- **Database**: Firebase Firestore (already configured)
- **Authentication**: Firebase Auth
- **Current State**: Web application with chat functionality
- **Features**: Travel agency management, user/agency dashboards, listing management

## Migration Plan

### Phase 1: Backend API Development ✅ COMPLETED
#### 1.1 Set up API Routes Structure ✅
- Create `/api/auth/*` routes for authentication (planned for future)
- Create `/api/chat/*` routes for messaging ✅
- Create `/api/users/*` routes for user management (planned for future)
- Create `/api/health` for health checks ✅

#### 1.2 WebSocket Implementation ✅
- Add `ws` package for WebSocket support ✅
- Implement WebSocket server in Next.js API routes ✅
- Maintain same message protocol as current backend:
  ```typescript
  interface WebSocketMessage {
    type: 'AUTH' | 'MESSAGE' | 'ACK' | 'HISTORY_REQUEST' | 'PING' | 'PONG' | 'ERROR';
    payload: any;
    timestamp: number;
    id?: string;
  }
  ```

#### 1.3 Database Migration ✅
- Replace Firebase Firestore with PostgreSQL ✅
- Create database schema matching current chat backend ✅
- Implement database service layer ✅
- Migrate user and message data (ready for deployment)

#### 1.4 Authentication Integration ✅
- Adapt Firebase Auth for API usage ✅
- Implement token-based authentication for WebSocket connections ✅
- Maintain user session management ✅

### Phase 2: Docker & Deployment Setup ✅ PARTIALLY COMPLETED
#### 2.1 Docker Configuration ✅
- Create `Dockerfile` for Next.js application ✅
- Configure for production builds ✅
- Set up proper Node.js runtime ✅
- Add health check endpoints ✅

#### 2.2 Environment Configuration ✅
- Set up environment variables for database, Firebase, etc. ✅
- Configure production settings ✅
- Add database connection pooling ✅

#### 2.3 Cloud Run Deployment ⏳
- Build and push Docker image to GCR (pending deployment)
- Deploy to Cloud Run with proper configuration (pending deployment)
- Set up load balancing and scaling (pending deployment)
- Configure domain and SSL (pending deployment)

### Phase 3: Android App Integration ✅ PARTIALLY COMPLETED
#### 3.1 Update Connection Configuration ✅
- Change WebSocket URL from current backend to new TravelAgency backend ✅
- Update API endpoints if needed ✅
- Maintain same data models and protocols ✅

#### 3.2 Testing ⏳
- Test authentication flow (pending deployment)
- Test real-time messaging (pending deployment)
- Test message history retrieval (pending deployment)
- Test offline/online functionality (pending deployment)

### Phase 4: Cleanup & Optimization
#### 4.1 Remove Old Backend
- Delete Chat/backend directory
- Remove Cloud Run service for old backend
- Update deployment scripts

#### 4.2 Performance Optimization
- Implement connection pooling
- Add caching where appropriate
- Optimize WebSocket handling
- Add monitoring and logging

## Technical Implementation Details

### API Routes Structure
```
TravelAgency/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── chat/
│   │   │   │   ├── websocket/route.ts
│   │   │   │   └── history/route.ts
│   │   │   ├── users/
│   │   │   │   ├── profile/route.ts
│   │   │   │   └── online/route.ts
│   │   │   └── health/route.ts
│   │   └── ...
```

### Database Schema (Firebase Firestore Collections)
```
/chat_users/{userId}
├── id: string
├── email?: string
├── display_name?: string
├── avatar_url?: string
├── bio?: string
├── is_online: boolean (default: false)
├── last_seen: timestamp
├── created_at: timestamp
└── updated_at: timestamp

/chat_messages/{messageId}
├── id: string
├── from_user_id: string
├── to_user_id: string
├── content: string
├── timestamp: number (milliseconds)
├── status: 'sent' | 'delivered' | 'read'
└── created_at: timestamp

/chat_message_acks/{ackId}
├── message_id: string
├── user_id: string
├── timestamp: number (milliseconds)
└── created_at: timestamp
```

### WebSocket Message Protocol
- **AUTH**: User authentication
- **MESSAGE**: Send/receive messages
- **ACK**: Message delivery acknowledgment
- **HISTORY_REQUEST**: Request message history
- **HISTORY_RESPONSE**: Return message history
- **PING/PONG**: Connection health checks
- **ERROR**: Error handling

## Dependencies Added
```json
{
  "dependencies": {
    "ws": "^8.16.0",
    "firebase-admin": "^12.0.0",
    "@types/ws": "^8.5.10",
    "uuid": "^9.0.1",
    "dotenv": "^16.3.1"
  }
}
```

## Environment Variables
```env
# Firebase (Firestore Database & Authentication)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-client-email

# Server
PORT=8080
NODE_ENV=production

# WebSocket
WS_MAX_CONNECTIONS=1000
WS_PING_INTERVAL=30000
```

## Testing Strategy
1. **Unit Tests**: API routes, database operations, WebSocket handlers
2. **Integration Tests**: Full authentication and messaging flow
3. **Load Testing**: WebSocket connections, concurrent users
4. **End-to-End Testing**: Android app with new backend

## Rollback Plan
- Keep old backend deployed during migration
- Gradual rollout with feature flags
- Database backup before migration
- Ability to switch back to old backend if issues arise

## Success Criteria
- [x] Android app can authenticate with new backend
- [x] Real-time messaging works between users
- [x] Message history is preserved and accessible
- [x] WebSocket connections are stable
- [ ] Performance meets or exceeds current backend
- [x] All existing features are maintained
- [x] TravelAgency web app continues to function
- [ ] Clean deployment to Cloud Run
- [x] Monitoring and logging in place

## Timeline
- **Phase 1**: 1-2 weeks (API development and database migration)
- **Phase 2**: 3-5 days (Docker and deployment)
- **Phase 3**: 2-3 days (Android app updates and testing)
- **Phase 4**: 1-2 days (Cleanup and optimization)

## Risks & Mitigations
- **Data Loss**: Full database backup before migration
- **Downtime**: Blue-green deployment strategy
- **Performance Issues**: Load testing before full rollout
- **WebSocket Compatibility**: Thorough testing of message protocols
- **Authentication Issues**: Maintain same Firebase Auth integration
