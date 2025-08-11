# WhatsApp Business Cloud API Management System

## Overview

A comprehensive SaaS-like WhatsApp Business Cloud API management system similar to botsailor or business on bot. The system works independently with direct WhatsApp API integration using access tokens, phone number IDs, and database configuration through GUI, while offering optional n8n integration for advanced marketing automation with message synchronization and template management from Facebook Business Manager.

## Recent Major Features (January 2025)

- **✅ Complete WhatsApp Business API Integration**: Direct messaging, webhook handling, real-time status updates
- **✅ Facebook Business Manager Template Sync**: One-click synchronization of approved message templates
- **✅ Real-time Bidirectional Messaging**: Live chat with WebSocket support and message status tracking
- **✅ Template Message System**: Proper WhatsApp template format support with dedicated API endpoints
- **✅ Enhanced UI/UX**: Clean chat interface with gradient avatars, phone number display, and status indicators
- **✅ Configuration Management**: Complete GUI-based setup for WhatsApp credentials and n8n integration
- **✅ Contact & Conversation Management**: Full CRUD operations with real-time updates
- **✅ Webhook Processing**: Comprehensive webhook handling for messages and status updates
- **✅ Media Upload/Download Support**: Images, videos, and documents via chat with WhatsApp API integration
- **✅ Template Variable Dialog**: Prompts for template variables before sending template messages
- **✅ Persistent Database Storage**: PostgreSQL database for data persistence across restarts
- **✅ Enhanced Read Receipts**: Blue tick indicators for read messages with proper status tracking
- **✅ Unread Message Indicators**: Visual count badges in conversation list for new messages
- **✅ Media Server Integration**: CDN configuration tab with support for Bunny CDN, AWS S3, Cloudinary, and custom CDN providers
- **✅ Database Schema Updates**: Extended configuration storage for CDN settings and media handling

## User Preferences

Preferred communication style: Simple, everyday language.
Technical level: Non-technical user requiring clear guidance and practical solutions.

## System Architecture

### Core Features

1. **WhatsApp Business Cloud API Integration**
   - Direct messaging via Facebook Graph API v18.0
   - Real-time webhook processing for incoming messages and status updates
   - Template message support with Facebook Business Manager sync
   - Phone number and Business Account ID auto-detection from webhook logs
   - Comprehensive error handling and logging

2. **Template Management System**
   - Facebook Business Manager integration for template synchronization
   - Support for approved templates with proper WhatsApp formatting
   - Template variable handling and content management
   - Dedicated API endpoints for template operations
   - Prevention of duplicate template imports

3. **Real-time Communication**
   - WebSocket-based live chat interface
   - Bidirectional message synchronization
   - Message status tracking (sent → delivered → read)
   - Real-time conversation updates and notifications
   - Auto-reconnection with exponential backoff

4. **Contact & Conversation Management**
   - Automatic contact creation from incoming messages
   - Conversation threading and message history
   - Contact grouping and categorization
   - Phone number validation and formatting
   - Contact profile management with avatars

### Frontend Architecture
The frontend is built using React with TypeScript and follows a component-based architecture:

- **UI Framework**: shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **State Management**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with WhatsApp-specific color schemes and gradients
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket integration with automatic reconnection
- **Form Management**: React Hook Form with Zod validation for all configuration forms

### Backend Architecture
The backend follows a REST API pattern with comprehensive WhatsApp integration:

- **Framework**: Express.js with TypeScript for type safety
- **WhatsApp Integration**: Direct Facebook Graph API integration with proper webhook handling
- **Session Management**: Express sessions with secure cookie configuration
- **API Design**: RESTful endpoints organized by feature with dedicated template messaging endpoints
- **Real-time Features**: WebSocket server for live chat updates and message status broadcasting
- **Webhook Processing**: Comprehensive webhook parsing for messages, statuses, and contact information
- **Error Handling**: Detailed logging and error responses with user-friendly messages

### Database Architecture
Now uses PostgreSQL database for persistent storage:

- **Storage System**: Database-backed storage using PostgreSQL with Neon serverless
- **Schema Design**: Comprehensive data models for users, contacts, conversations, messages, templates, broadcasts, and app configuration
- **Configuration Management**: Per-user configuration storage for WhatsApp credentials and system settings
- **Webhook Logging**: Complete audit trail of all webhook events and API interactions
- **Message Management**: Full message history with status tracking and metadata storage
- **Template Storage**: Support for Facebook Business Manager template synchronization with metadata

### Authentication System
Simple session-based authentication optimized for single-user or small team deployments:

- **Storage**: Express sessions with configurable storage backend
- **Security**: HTTP-only cookies with secure flags in production
- **Password Hashing**: bcrypt for secure password storage
- **Authorization**: Middleware-based route protection for all API endpoints
- **User Management**: Simple username/password authentication with session persistence

### Real-time Communication
WebSocket implementation for live updates:

- **Connection Management**: Map-based WebSocket connection tracking per user
- **Message Types**: Structured message types for different real-time events (new messages, status updates)
- **Auto-reconnection**: Client-side reconnection logic with exponential backoff
- **Query Invalidation**: Automatic cache updates when receiving real-time events

### Component Architecture
Modular component structure optimized for WhatsApp Business workflows:

- **Chat Interface**: Complete messaging interface with template selection and file upload support
- **Template Manager**: Facebook Business Manager sync with template creation and editing
- **Contact Management**: Automatic contact creation with manual management capabilities  
- **Settings Configuration**: Comprehensive GUI for WhatsApp API and n8n configuration
- **Message Components**: Status-aware message bubbles with gradient avatars and timestamps
- **UI Components**: Consistent shadcn/ui components with WhatsApp green theming

### Build and Development
Modern build tooling and development experience:

- **Build Tool**: Vite for fast development and optimized production builds
- **Development**: Hot module replacement and error overlays
- **Production**: Separate client and server builds with static asset serving
- **Type Checking**: Full TypeScript coverage across frontend, backend, and shared schemas

## Deployment Instructions

### Prerequisites

1. **WhatsApp Business Account Setup**:
   - Facebook Business Account with verified phone number
   - WhatsApp Business Account connected to Facebook Business
   - Facebook App with WhatsApp Business product enabled
   - Access Token with `whatsapp_business_messaging` permissions
   - Phone Number ID from WhatsApp Business Account

2. **System Requirements**:
   - Node.js 18+ 
   - Modern web browser (Chrome, Firefox, Safari, Edge)
   - HTTPS domain for webhook configuration (required by WhatsApp)

### Online Deployment (Recommended)

#### Option 1: Replit Deployment (Easiest)
1. **Fork the Project**: Click "Fork" button in Replit
2. **Configure Environment**: Set up the following secrets in Replit:
   ```
   SESSION_SECRET=your-secure-session-secret-here
   DATABASE_URL=postgresql://... (if using persistent storage)
   ```
3. **Run the Application**: Click "Run" button
4. **Access the Application**: Use the provided Replit URL
5. **Configure WhatsApp**: 
   - Go to Settings → WhatsApp Business
   - Add your Access Token and Phone Number ID
   - Use the Replit URL for webhook configuration in Facebook Developer Console

#### Option 2: Vercel/Netlify/Heroku
1. **Repository Setup**: Push code to GitHub repository
2. **Deploy**: Connect repository to your preferred platform
3. **Environment Variables**: Configure required secrets
4. **Domain Setup**: Ensure HTTPS domain for webhook configuration
5. **WhatsApp Configuration**: Update webhook URLs in Facebook Developer Console

#### Option 3: Docker Deployment
```bash
# Clone repository
git clone <repository-url>
cd whatsapp-business-portal

# Build Docker image
docker build -t whatsapp-business-portal .

# Run container
docker run -p 5000:5000 \
  -e SESSION_SECRET="your-secret" \
  -e DATABASE_URL="postgresql://..." \
  whatsapp-business-portal
```

### Offline/Local Development

#### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Application runs on http://localhost:5000
```

#### Local Configuration
1. **Create `.env` file**:
   ```env
   SESSION_SECRET=development-secret-key
   NODE_ENV=development
   # Optional: DATABASE_URL for persistent storage
   ```

2. **WhatsApp Setup for Local Development**:
   - Use ngrok for HTTPS tunnel: `ngrok http 5000`
   - Use ngrok URL for webhook configuration
   - Note: WhatsApp requires HTTPS webhooks

### Production Configuration

#### WhatsApp Business API Setup
1. **Facebook Developer Console**:
   - Create Facebook App with WhatsApp Business product
   - Generate Access Token with proper permissions
   - Configure webhook URL: `https://yourdomain.com/api/webhooks/whatsapp`
   - Set webhook verify token (matches your configuration)
   - Subscribe to `messages` webhook field

2. **Application Configuration**:
   - Access Token: From Facebook App dashboard
   - Phone Number ID: From WhatsApp Business Account (e.g., `776001938919357`)
   - Business Account ID: From webhook logs (e.g., `732324892861637`)
   - Webhook Verify Token: Custom secure string

#### Security Considerations
- Use strong SESSION_SECRET in production
- Enable HTTPS for all production deployments
- Configure proper CORS policies
- Set secure cookie flags in production environment
- Regularly rotate access tokens and webhook secrets

### Feature Configuration

#### Template Sync Setup
1. **Business Account ID**: Required for Facebook Business Manager integration
2. **Template Sync**: Go to Templates → "Sync from Facebook" button
3. **Template Usage**: Available immediately in chat interface

#### n8n Integration (Optional)
1. **Enable n8n**: Toggle in Settings → n8n Integration
2. **Webhook URL**: Your n8n instance webhook endpoint
3. **API Key**: Optional for advanced n8n operations
4. **Workflow Setup**: Configure n8n workflows to receive WhatsApp data

### Troubleshooting

#### Common Issues
1. **Template Not Found Error**: 
   - Verify Business Account ID is correct
   - Ensure templates are approved in Facebook Business Manager
   - Check template name formatting (lowercase, underscores only)

2. **Webhook Not Working**:
   - Verify HTTPS URL is accessible
   - Check webhook verify token matches configuration
   - Ensure proper Facebook App permissions

3. **Messages Not Sending**:
   - Verify Access Token has proper permissions
   - Check Phone Number ID is correct
   - Ensure recipient number format (+country_code)

## External Dependencies

### Core Technologies
- **React + TypeScript**: Modern frontend with type safety
- **Express.js**: Backend API server with middleware support
- **shadcn/ui + Tailwind CSS**: Modern UI components and styling
- **TanStack Query**: Server state management and caching
- **WebSocket (ws)**: Real-time communication
- **Vite**: Fast development and production builds

### WhatsApp Integration
- **Facebook Graph API**: WhatsApp Business Cloud API integration
- **Webhook Processing**: Real-time message and status updates
- **Template Management**: Facebook Business Manager synchronization

### Development Tools
- **TypeScript**: Full type coverage across application
- **Zod**: Runtime validation and schema parsing
- **React Hook Form**: Form management with validation
- **Lucide React**: Consistent iconography
