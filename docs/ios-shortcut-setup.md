# iOS Shortcut Setup Guide

This guide walks you through creating the LifeTracker iOS Shortcut for voice-based task capture.

## Prerequisites

Before creating the shortcut, verify:

1. **API is deployed and accessible**
   - Test from your phone's browser: `https://lifetracker.maverickapplications.com/health`
   - Should return: `{"status":"ok","services":{"api":"healthy","llm":"healthy"}}`

2. **API Key is configured**
   - Default development key: `dev-api-key-change-in-production`
   - For production, generate a secure key and update `.env`

3. **iPhone with iOS 16+** (for Shortcuts app and Action Button support)

---

## Quick Test (Verify API Access)

Before building the full shortcut, create a simple test:

1. Open **Shortcuts** app
2. Tap **+** to create new shortcut
3. Add action: **Get Contents of URL**
   - URL: `https://lifetracker.maverickapplications.com/health`
4. Add action: **Quick Look**
5. Run the shortcut

**Expected Result:** JSON response showing `"status":"ok"`

If this fails, check:
- Your server is running (`docker compose up -d`)
- DNS is pointing to your server
- HTTPS certificates are valid
- Firewall allows port 443

---

## Create the LifeTracker Shortcut

### Step-by-Step Instructions

#### 1. Create New Shortcut
- Open **Shortcuts** app
- Tap **+** in top right
- Tap shortcut name, rename to **"LifeTracker"**

#### 2. Add Dictation Action
- Tap **Add Action**
- Search for **"Dictate Text"**
- Add it to your shortcut
- Configure:
  - Stop Listening: **After Pause** (or "After Short Pause" for faster response)
  - Language: Your preferred language

#### 3. Store the Spoken Text
- Add action: **Set Variable**
- Variable Name: `SpokenText`
- Input: Select **Dictated Text** from the previous action

#### 4. Check if Input Exists
- Add action: **If**
- Input: `SpokenText`
- Condition: **has any value**

#### 5. Make API Request (Inside the If block)
- Add action: **Get Contents of URL**
- URL: `https://lifetracker.maverickapplications.com/api/voice`
- Tap **Show More** to expand options:
  - **Method:** POST
  - **Headers:** Add two headers:
    | Key | Value |
    |-----|-------|
    | `X-API-Key` | `dev-api-key-change-in-production` |
    | `Content-Type` | `application/json` |
  - **Request Body:** JSON
    - Add new field:
      - Key: `input`
      - Type: Text
      - Value: Select `SpokenText` variable

#### 6. Store API Response
- Add action: **Set Variable**
- Variable Name: `Response`
- Input: **Contents of URL** result

#### 7. Check API Response (Nested If)
- Add action: **If**
- Input: `Response`
- Condition: **has any value**

#### 8. Extract Message (Inside nested If - Success case)
- Add action: **Get Dictionary Value**
- Key: `message`
- Dictionary: `Response`

#### 9. Show Success Notification
- Add action: **Show Notification**
- Title: `LifeTracker`
- Body: Select **Dictionary Value** result

#### 10. Handle API Failure (Otherwise of nested If)
- In the **Otherwise** section of the nested If:
- Add action: **Show Notification**
  - Title: `LifeTracker`
  - Body: `Server unavailable. Saving for later.`

#### 11. Save to Reminders as Fallback
- Add action: **Add New Reminder**
- Reminder: `[PENDING] ` followed by `SpokenText` variable
- List: **Reminders** (or create a "LifeTracker Pending" list)

#### 12. Handle No Speech (Otherwise of outer If)
- In the **Otherwise** section of the outer If:
- Add action: **Show Notification**
  - Title: `LifeTracker`
  - Body: `No input detected`

---

## Complete Shortcut Structure

```
Dictate Text
    └─> Set Variable: SpokenText

If [SpokenText] has any value
    │
    ├── Get Contents of URL
    │   URL: https://lifetracker.maverickapplications.com/api/voice
    │   Method: POST
    │   Headers:
    │     X-API-Key: [your-api-key]
    │     Content-Type: application/json
    │   Body (JSON):
    │     input: [SpokenText]
    │   └─> Set Variable: Response
    │
    ├── If [Response] has any value
    │   │
    │   ├── Get Dictionary Value (key: message)
    │   │   └─> Show Notification
    │   │       Title: LifeTracker
    │   │       Body: [Dictionary Value]
    │   │
    │   └── Otherwise (API failed)
    │       ├── Show Notification
    │       │   Title: LifeTracker
    │       │   Body: Server unavailable. Saving for later.
    │       │
    │       └── Add New Reminder
    │           Title: [PENDING] [SpokenText]
    │
    └── End If

Otherwise (No speech detected)
    │
    └── Show Notification
        Title: LifeTracker
        Body: No input detected

End If
```

---

## Assign to Action Button (Optional)

If you have an iPhone 15 Pro or later:

1. Go to **Settings** > **Action Button**
2. Swipe to **Shortcut**
3. Tap **Choose a Shortcut**
4. Select **LifeTracker**

Now pressing the Action Button will trigger voice capture.

---

## Alternative: Widget or Home Screen

1. Long-press on home screen
2. Tap **+** in top left
3. Search for **Shortcuts**
4. Add the Shortcuts widget
5. Configure to show the LifeTracker shortcut

Or add directly to home screen:
1. Open Shortcuts app
2. Long-press the LifeTracker shortcut
3. Tap **Share**
4. Tap **Add to Home Screen**

---

## Testing Checklist

Run through these tests to verify everything works:

| Test | Voice Input | Expected Result |
|------|-------------|-----------------|
| Basic task | "Add buy milk" | Notification: "Added: Buy milk" |
| Natural language | "Remind me to call mom tomorrow" | Notification: "Added: Call mom" |
| Minimal input | "eggs" | Notification: "Added: Eggs" |
| Long input | "I need to research health insurance options and compare plans" | Task created with full title |
| No speech | (stay silent) | Notification: "No input detected" |
| Server offline | (with server stopped) | Notification: "Server unavailable..." + Reminder created |

After each successful test, verify the task appears in the web UI at:
`https://lifetracker.maverickapplications.com`

---

## Troubleshooting

### "Server unavailable" every time
- Check API is running: `curl https://lifetracker.maverickapplications.com/health`
- Verify API key matches between shortcut and server `.env`
- Check HTTPS certificate is valid

### No notification appears
- Ensure Shortcuts has notification permissions
- Settings > Notifications > Shortcuts > Allow Notifications

### Dictation doesn't work
- Check microphone permissions for Shortcuts
- Settings > Privacy & Security > Microphone > Shortcuts

### Task created but title is raw input
- LLM may be unavailable (fallback mode)
- Check `/health` endpoint - if `llm: "degraded"`, Ollama may need to be started
- Verify Ollama has the model: `ollama list` should show `gpt-oss:20b`

### "Validation Error" response
- Input may be empty or too long (>1000 chars)
- Check the `SpokenText` variable is being passed correctly

---

## Security Notes

1. **API Key**: The default `dev-api-key-change-in-production` should be replaced with a secure random string for production use:
   ```bash
   # Generate a secure API key
   openssl rand -hex 32
   ```

2. **HTTPS**: Always use HTTPS for the API URL to protect your API key in transit.

3. **Key Storage**: The API key is stored in your shortcut. Don't share the shortcut without removing or changing the key first.

---

## Quick Reference

| Item | Value |
|------|-------|
| API URL | `https://lifetracker.maverickapplications.com/api/voice` |
| Health Check | `https://lifetracker.maverickapplications.com/health` |
| Method | POST |
| Required Header | `X-API-Key: [your-key]` |
| Content Type | `application/json` |
| Request Body | `{"input": "[spoken text]"}` |
| Success Response | `{"success": true, "message": "Added: [title]", ...}` |
