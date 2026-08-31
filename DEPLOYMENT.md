# Audio Feedback Review - Cloud Deployment Guide

## Quick Start (Railway.app - Recommended)

Railway is the easiest option. Follow these steps:

### 1. Create a GitHub Repository
- Go to https://github.com/new
- Create a new repository named `audio-feedback-review`
- Clone it locally or upload these files

### 2. Push Code to GitHub
```bash
cd "/Users/jon/Library/CloudStorage/GoogleDrive-jmysel@clicktherapeutics.com/My Drive/Audio Feedback Review"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/audio-feedback-review.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Railway
- Go to https://railway.app
- Click "New Project"
- Select "Deploy from GitHub"
- Connect your GitHub account
- Select the `audio-feedback-review` repository
- Railway will auto-detect it as a Node.js app
- Click "Deploy"
- Your app will be live in ~2 minutes at a URL like `https://audio-feedback-xxx.railway.app`

### 4. Share the URL
Once deployed, share this URL with reviewers:
```
https://audio-feedback-xxx.railway.app/audio-feedback.html
```

## Environment Variables
- No additional setup needed - the app uses `PORT` from the environment automatically

## Data Persistence
⚠️ **Important:** Railway's free tier uses ephemeral storage. CSV files will be lost when the app restarts.

**Solution:** Use Railway's PostgreSQL add-on (free tier available) or upgrade to a paid plan for persistent storage.

For now, Railway is great for testing. If you need permanent data storage, consider:
- **Render.com** - Better free tier with persistent storage
- **Heroku** - Paid but reliable (free tier discontinued)

## Alternative: Render.com
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - Build Command: (leave empty)
   - Start Command: `node server.js`
5. Deploy

Render offers more generous free tier limits.
