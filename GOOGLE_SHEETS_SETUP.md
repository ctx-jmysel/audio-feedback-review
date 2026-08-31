# Google Sheets Setup Guide

This application now saves feedback directly to a Google Sheet instead of CSV files. Follow these steps:

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "Audio Feedback Reviews"
3. In Sheet1, create headers in the first row:
   ```
   clipId | clipTitle | clipSource | reviewer | rating | descriptors | feedbackNotes | updatedAt
   ```
4. **Copy the Spreadsheet ID** from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Keep this ID handy, you'll need it in Step 3

## Step 2: Create a Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing):
   - Click "Select a Project" → "New Project"
   - Name: "Audio Feedback Review"
   - Click "Create"

3. Enable Google Sheets API:
   - Click "Library" in left sidebar
   - Search for "Google Sheets API"
   - Click it, then "Enable"

4. Create a Service Account:
   - Click "Credentials" in left sidebar
   - Click "Create Credentials" → "Service Account"
   - Fill in:
     - Service account name: `audio-feedback-bot`
     - Click "Create and Continue"
     - Grant role: "Editor" (to allow writing to sheets)
     - Click "Continue" → "Done"

5. Create and Download JSON Key:
   - In Credentials, find your service account
   - Click on it
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON"
   - **Download the JSON file** - keep it safe!

## Step 3: Share the Google Sheet with Service Account

1. Open your Google Sheet from Step 1
2. Click "Share" (top right)
3. In the JSON key file, find the `client_email` field
4. Paste that email address in the Share dialog
5. Give it "Editor" access
6. Click "Share"

## Step 4: Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Go to "Variables" tab
3. Add two new variables:

   **Variable 1: SPREADSHEET_ID**
   - Key: `SPREADSHEET_ID`
   - Value: (paste the Spreadsheet ID from Step 1)

   **Variable 2: GOOGLE_CREDENTIALS**
   - Key: `GOOGLE_CREDENTIALS`
   - Value: (paste the entire contents of the JSON key file from Step 2)

4. Click "Deploy" to apply changes

## Step 5: Test

1. Go to your Railway app URL: `https://web-production-f58a4.up.railway.app/audio-feedback.html`
2. Fill out a test review
3. Click "Submit Review"
4. Check your Google Sheet - new rows should appear!

## Troubleshooting

**"Google Sheets not configured":**
- Check that both SPREADSHEET_ID and GOOGLE_CREDENTIALS are set in Railway Variables
- Make sure the service account email has access to the sheet

**Sheets API errors:**
- Verify the client_email from JSON was shared with the sheet
- Check that Google Sheets API is enabled in Cloud Console

**Blank submissions:**
- Wait 2-3 seconds after submitting
- Refresh the sheet to see updates

---

✅ All feedback will now be saved to your Google Sheet in real-time!
