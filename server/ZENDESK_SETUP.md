# Zendesk Help Center API Setup

This project has been updated to use the Zendesk Help Center API instead of Firecrawl for loading knowledge base articles.

## Environment Variables

You need to add the following environment variables to your `.env` file:

```bash
# Zendesk Help Center API Configuration
ZENDESK_SUBDOMAIN="tipspace"  # Your Zendesk subdomain (without .zendesk.com)
ZENDESK_EMAIL="your-email@example.com"  # Your Zendesk email address
ZENDESK_API_TOKEN="your-api-token"  # Your Zendesk API token
```

## Getting Your Zendesk API Token

1. Go to your Zendesk Admin Center
2. Navigate to Apps and integrations > APIs > Zendesk API
3. Click on "Settings" tab
4. Enable "Token access" if not already enabled
5. Click "Add API token"
6. Copy the token and add it to your `.env` file

## Removed Dependencies

The following environment variable is no longer needed:
- `FIRECRAWL_API_KEY` (removed)

The `@mendable/firecrawl-js` package has been removed from package.json.

## How It Works

The new implementation:
1. Uses the Zendesk Help Center API to fetch all articles in Portuguese (pt-br)
2. Converts HTML content to markdown format
3. Processes articles in chunks for vector embeddings
4. Stores embeddings in PostgreSQL with metadata including article ID and title
5. Supports pagination to fetch all articles from your knowledge base

## Benefits

- More reliable than web scraping
- Better rate limiting and error handling
- Access to structured article metadata
- No dependency on external scraping services
- Direct access to Zendesk's official API 
