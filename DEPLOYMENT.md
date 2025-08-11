# 🚀 Deployment Guide - WhatsApp Business Hub

## 🌐 Vercel Deployment (Recommended)

### 1. **Prepare Your Repository**
```bash
# Make sure all changes are committed
git add .
git commit -m "Enterprise WhatsApp platform ready for deployment"
git push origin main
```

### 2. **Vercel Setup**
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Node.js
   - **Root Directory**: `./` (root of project)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. **Environment Variables**
Set these in your Vercel project settings:

```env
# Required
NODE_ENV=production
DATABASE_URL=your_postgresql_connection_string

# Optional
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=your_jwt_secret_key
```

### 4. **Deploy**
- Vercel will automatically deploy on every push to main
- Your API will be available at: `https://yourproject.vercel.app`

## 🗄️ Database Setup

### 1. **Neon Database (Recommended)**
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Set as `DATABASE_URL` in Vercel

### 2. **Database Migration**
```bash
# Run this locally first to set up your database
npm run db:push
```

## 🔧 Environment Configuration

### **Production Environment Variables**
```env
# Core
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database

# Security
JWT_SECRET=your-super-secret-jwt-key-64-characters-minimum

# Frontend
FRONTEND_URL=https://yourdomain.com

# WhatsApp Business API (configure via GUI after deployment)
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```

## 📱 WhatsApp Business API Setup

### 1. **Facebook Developer Console**
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app or use existing
3. Add WhatsApp Business product
4. Generate access token with permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`

### 2. **Webhook Configuration**
1. In your app settings, configure webhook:
   - **URL**: `https://yourproject.vercel.app/api/webhooks/whatsapp`
   - **Verify Token**: Any secure string
   - **Fields**: Subscribe to `messages` and `message_status`

### 3. **Phone Number Setup**
1. Go to WhatsApp Business Manager
2. Add phone number
3. Note down Phone Number ID
4. Configure webhook URL

## 🧪 Testing Your Deployment

### 1. **Health Check**
```bash
curl https://yourproject.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "environment": "production",
  "version": "1.0.0"
}
```

### 2. **API Documentation**
```bash
curl https://yourproject.vercel.app/api/v1/docs
```

### 3. **Feature Flags**
```bash
curl https://yourproject.vercel.app/api/v1/features
```

## 🔍 Troubleshooting

### **Common Issues**

#### 1. **Build Failures**
- Check Node.js version (requires 18+)
- Ensure all dependencies are in package.json
- Check TypeScript compilation errors

#### 2. **Database Connection Issues**
- Verify DATABASE_URL format
- Check database is accessible from Vercel
- Ensure database schema is migrated

#### 3. **WhatsApp Webhook Issues**
- Verify webhook URL is accessible
- Check webhook verify token matches
- Ensure HTTPS is enabled

#### 4. **CORS Issues**
- Check FRONTEND_URL environment variable
- Verify CORS configuration in server code

### **Debug Commands**
```bash
# Check build locally
npm run build

# Check TypeScript
npm run check

# Test server locally
npm run dev

# Check database
npm run db:studio
```

## 📊 Monitoring & Analytics

### 1. **Vercel Analytics**
- Built-in performance monitoring
- Function execution times
- Error tracking

### 2. **Custom Monitoring**
- Health check endpoints
- Status monitoring
- Performance metrics

## 🔒 Security Considerations

### 1. **Environment Variables**
- Never commit secrets to Git
- Use Vercel's encrypted environment variables
- Rotate secrets regularly

### 2. **Database Security**
- Use connection pooling
- Enable SSL for database connections
- Restrict database access

### 3. **API Security**
- Rate limiting (configured)
- CORS protection
- Input validation

## 🚀 Next Steps After Deployment

### 1. **Configure WhatsApp Business API**
1. Access your deployed app
2. Go to Settings → WhatsApp Business
3. Enter your API credentials
4. Test webhook connection

### 2. **Set Up Organizations**
1. Create your first organization
2. Configure business settings
3. Add team members

### 3. **Import Contacts**
1. Use CSV import feature
2. Set up contact groups
3. Configure automation rules

### 4. **Test Messaging**
1. Send test messages
2. Verify delivery status
3. Test webhook functionality

## 📞 Support

- **Documentation**: [https://docs.whatsappbusinesshub.com](https://docs.whatsappbusinesshub.com)
- **GitHub Issues**: [Report bugs here](https://github.com/yourusername/whatsapp-business-hub/issues)
- **Community**: [Join our Discord](https://discord.gg/whatsappbusinesshub)

---

**🎉 Congratulations! Your enterprise WhatsApp platform is now deployed and ready to scale your business communication.**
