# WhatsApp Business Portal

## Overview

This is a WhatsApp Business management portal that provides a comprehensive chat interface, template messaging system, and bulk broadcasting capabilities. The application is built as a full-stack web application with real-time messaging features and integrates with n8n workflows for automation. It serves as a centralized platform for managing WhatsApp Business communications, contacts, and message templates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript and follows a component-based architecture. Key design decisions include:

- **UI Framework**: Uses shadcn/ui components built on top of Radix UI primitives for consistent, accessible design
- **State Management**: Leverages TanStack Query for server state management and caching, avoiding complex client-side state management
- **Styling**: Tailwind CSS with custom CSS variables for theming, including WhatsApp-specific color schemes
- **Routing**: Uses Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket integration for live message updates and status changes

### Backend Architecture
The backend follows a REST API pattern with WebSocket support:

- **Framework**: Express.js with TypeScript for type safety
- **Session Management**: Express sessions with PostgreSQL storage for user authentication
- **API Design**: RESTful endpoints organized by feature (auth, contacts, conversations, messages, templates, broadcasts)
- **Real-time Features**: WebSocket server for live chat updates and message status changes
- **Middleware**: Custom logging, authentication, and error handling middleware

### Database Architecture
Uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **Schema Design**: Normalized relational structure with tables for users, contacts, conversations, messages, templates, and broadcasts
- **ORM**: Drizzle provides compile-time type safety and migration management
- **Connection Management**: Neon serverless PostgreSQL with connection pooling

### Authentication System
Session-based authentication with the following characteristics:

- **Storage**: Sessions stored in PostgreSQL using connect-pg-simple
- **Security**: HTTP-only cookies with secure flags in production
- **Password Hashing**: bcrypt for secure password storage
- **Authorization**: Middleware-based route protection

### Real-time Communication
WebSocket implementation for live updates:

- **Connection Management**: Map-based WebSocket connection tracking per user
- **Message Types**: Structured message types for different real-time events (new messages, status updates)
- **Auto-reconnection**: Client-side reconnection logic with exponential backoff
- **Query Invalidation**: Automatic cache updates when receiving real-time events

### Component Architecture
Modular component structure organized by feature:

- **Chat Components**: Message bubbles, chat lists, and conversation interfaces
- **Template Management**: Template creation, editing, and variable handling
- **Contact Management**: Contact CRUD operations with group management
- **Broadcast System**: Bulk messaging with template integration
- **UI Components**: Reusable shadcn/ui components with consistent styling

### Build and Development
Modern build tooling and development experience:

- **Build Tool**: Vite for fast development and optimized production builds
- **Development**: Hot module replacement and error overlays
- **Production**: Separate client and server builds with static asset serving
- **Type Checking**: Full TypeScript coverage across frontend, backend, and shared schemas

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with automatic scaling
- **Connection Pooling**: Built-in connection management for serverless environments

### UI and Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Unstyled, accessible UI components
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography

### Development and Build Tools
- **Vite**: Build tool and development server
- **Replit Integration**: Development environment integration with runtime error handling
- **ESBuild**: Fast JavaScript bundler for production builds

### Authentication and Session Management
- **express-session**: Session middleware for Express.js
- **connect-pg-simple**: PostgreSQL session store
- **bcrypt**: Password hashing library

### Real-time and Network
- **WebSocket (ws)**: WebSocket implementation for real-time communication
- **TanStack Query**: Data fetching and caching library
- **React Hook Form**: Form state management with validation

### External API Integration
- **n8n Integration**: Webhook-based integration with n8n automation platform for workflow triggers
- **Fetch API**: Modern HTTP client for external service communication

### Type Safety and Validation
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Zod**: Runtime type validation and schema parsing
- **TypeScript**: Full type coverage across the application stack