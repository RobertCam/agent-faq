# Deployment Guide

## Deploying to Vercel

### Prerequisites
- GitHub repository set up (already done)
- Vercel account (sign up at [vercel.com](https://vercel.com))

### Steps

1. **Push your code to GitHub** (already done)
   ```bash
   git push origin main
   ```

2. **Import project on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository: `RobertCam/agent-faq`
   - Vercel will auto-detect it's a Next.js project

3. **Configure Environment Variables**
   In the Vercel project settings, add these environment variables:
   
   ```
   OPENAI_API_KEY=your_openai_api_key
   SERPAPI_KEY=your_serpapi_key
   NEXT_PUBLIC_BASE_URL=https://your-app-name.vercel.app
   ```

4. **Deploy**
   - Click "Deploy" button
   - Wait for the build to complete (~2-3 minutes)

5. **Access Your App**
   - Once deployed, your app will be available at: `https://your-app-name.vercel.app`
   - You can customize the domain in Vercel project settings

### Alternative Deployment Options

#### Netlify
1. Import from GitHub on [netlify.com](https://netlify.com)
2. Add environment variables in Site Settings
3. Deploy

#### Railway
1. Import from GitHub on [railway.app](https://railway.app)
2. Add environment variables in Variables tab
3. Deploy

### Important Notes

⚠️ **Environment Variables**: Never commit your `.env.local` file. Make sure these variables are added in your deployment platform's settings.

⚠️ **Free Tier Limits**:
- OpenAI API: Pay as you go
- SerpAPI: 100 searches/month on free tier
- Vercel: Generous free tier for Next.js apps

⚠️ **In-Memory Storage**: Drafts are stored in-memory and will be lost on server restart. For production, consider:
- Database (PostgreSQL, MongoDB)
- Redis for caching
- Vercel KV for edge storage

### Post-Deployment Checklist

- [ ] Test FAQ generation
- [ ] Verify environment variables are set
- [ ] Check logs for any errors
- [ ] Update documentation with live URL
- [ ] Test editor functionality
- [ ] Set up custom domain (optional)

### Troubleshooting

**Build fails**: Check Vercel build logs for missing dependencies or syntax errors

**API errors**: Verify environment variables are correctly set in Vercel project settings

**Rate limiting**: Increase rate limits or upgrade API plans if hitting limits

**Drafts not persisting**: This is expected behavior with in-memory storage. Implement database for production.

