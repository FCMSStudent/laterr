# Migration Guide: Moving from Lovable + Supabase to AWS or Google Cloud

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding Your Current Setup](#understanding-your-current-setup)
3. [Migration Overview](#migration-overview)
4. [AWS Migration Path](#aws-migration-path)
5. [Google Cloud Migration Path](#google-cloud-migration-path)
6. [Cost Comparison](#cost-comparison)
7. [Non-Programmer Guide](#non-programmer-guide)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide will help you migrate your Laterr Garden application from Lovable and Supabase to either AWS (Amazon Web Services) or Google Cloud Platform. It's written with non-programmers in mind, explaining technical concepts in simple terms.

### What You're Moving

Your application consists of:
- **Frontend**: The web pages users see (React app)
- **Database**: Where your data is stored (PostgreSQL)
- **Backend Functions**: Code that runs on servers (AI processing, content analysis)
- **File Storage**: Where images and files are kept
- **Authentication**: User login system (currently public)

---

## Understanding Your Current Setup

### Current Architecture

```
User's Browser
    ↓
Lovable Platform (Hosts your website)
    ↓
Supabase Platform (Database + Backend + Storage)
    ↓
OpenAI (AI features)
```

### What Each Service Does

**Lovable AI Platform:**
- Hosts your website files
- Makes your site available on the internet
- Handles deployments when you make changes

**Supabase:**
- Stores all your data (URLs, notes, tags, etc.)
- Runs backend code (analyzing URLs, generating embeddings)
- Stores uploaded images and files
- Provides database with AI search capabilities (pgvector)

**OpenAI:**
- Generates summaries of content
- Creates embeddings for semantic search
- Analyzes images

---

## Migration Overview

### Why Migrate?

Reasons you might want to migrate:
- **Cost**: AWS/GCP may be cheaper at scale
- **Control**: More configuration options
- **Compliance**: Specific regulatory requirements
- **Integration**: Easier to integrate with existing AWS/GCP services

### What Stays the Same

- Your React code (frontend)
- Your database structure
- Your AI features (still using OpenAI)
- Your app functionality

### What Changes

- Where your website files are hosted
- How your backend functions run
- Where your database lives
- How files are stored

---

## AWS Migration Path

### Overview

AWS equivalent services:
- **Lovable** → **AWS Amplify** or **S3 + CloudFront**
- **Supabase Database** → **Amazon RDS (PostgreSQL)**
- **Supabase Edge Functions** → **AWS Lambda**
- **Supabase Storage** → **Amazon S3**
- **Supabase Auth** → **Amazon Cognito** (optional)

### Prerequisites

Before starting, you'll need:
- An AWS account (sign up at aws.amazon.com)
- AWS CLI installed on your computer
- Your OpenAI API key
- Basic command line knowledge (or help from a developer)

### Step-by-Step AWS Migration

#### Step 1: Set Up AWS Account

1. **Create AWS Account**
   - Go to https://aws.amazon.com
   - Click "Create an AWS Account"
   - Follow the signup process
   - **Important**: Set up Multi-Factor Authentication (MFA) for security
   - Add billing alerts to avoid unexpected charges

2. **Install AWS CLI**
   ```bash
   # For Mac/Linux (using Homebrew)
   brew install awscli
   
   # For Windows
   # Download from: https://aws.amazon.com/cli/
   ```

3. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter default region (e.g., us-east-1)
   # Enter default output format: json
   ```

#### Step 2: Migrate the Database

**2.1 Export Data from Supabase**

1. Open your Supabase dashboard
2. Go to Database → Backups
3. Download a backup of your database
4. Also export your data using SQL:
   ```sql
   -- Connect to Supabase using their SQL editor
   COPY (SELECT * FROM items) TO '/tmp/items.csv' CSV HEADER;
   COPY (SELECT * FROM categories) TO '/tmp/categories.csv' CSV HEADER;
   COPY (SELECT * FROM tag_icons) TO '/tmp/tag_icons.csv' CSV HEADER;
   ```

**2.2 Create RDS PostgreSQL Instance**

1. **Go to AWS RDS Console**
   - Navigate to https://console.aws.amazon.com/rds/

2. **Create Database**
   - Click "Create database"
   - Choose "PostgreSQL"
   - Select version 15 or later (for pgvector support)
   - **Template**: Production or Dev/Test based on your needs
   - **DB instance identifier**: laterr-garden-db
   - **Master username**: postgres
   - **Master password**: (create a strong password, save it securely)

3. **Configure Instance**
   - **DB instance class**: Start with db.t3.micro (can scale later)
   - **Storage**: 20 GB General Purpose SSD (can auto-scale)
   - **VPC**: Default VPC is fine for now
   - **Public access**: Yes (needed to connect from Lambda)
   - **VPC security group**: Create new, name it "laterr-garden-db-sg"
   - **Database port**: 5432 (default)

4. **Create Database** (wait 10-15 minutes for provisioning)

**2.3 Install pgvector Extension**

1. Connect to your RDS instance using a PostgreSQL client:
   ```bash
   psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d postgres
   ```

2. Install pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

**2.4 Run Database Migrations**

1. Copy your migration files from `supabase/migrations/`
2. Run each migration in order:
   ```bash
   psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d postgres -f supabase/migrations/20251027091450_3c19769a-830c-4273-84e6-0cc4d91e4c24.sql
   # Repeat for each migration file
   ```

3. Import your data:
   ```sql
   COPY categories FROM '/path/to/categories.csv' CSV HEADER;
   COPY items FROM '/path/to/items.csv' CSV HEADER;
   COPY tag_icons FROM '/path/to/tag_icons.csv' CSV HEADER;
   ```

#### Step 3: Set Up File Storage (S3)

**3.1 Create S3 Buckets**

1. **Go to S3 Console**: https://s3.console.aws.amazon.com/

2. **Create buckets** (you'll need multiple):
   ```bash
   # Using AWS CLI
   aws s3 mb s3://laterr-garden-uploads
   aws s3 mb s3://laterr-garden-thumbnails
   aws s3 mb s3://laterr-garden-static
   ```

3. **Configure CORS for upload bucket**:
   - Select `laterr-garden-uploads` bucket
   - Go to Permissions → CORS
   - Add this configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

**3.2 Set Up Bucket Policies**

For each bucket, configure appropriate access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::laterr-garden-uploads/*"
    }
  ]
}
```

**3.3 Migrate Existing Files**

1. Export files from Supabase Storage
2. Upload to S3:
   ```bash
   aws s3 sync ./local-backup/ s3://laterr-garden-uploads/
   ```

#### Step 4: Deploy Backend Functions (Lambda)

**4.1 Prepare Lambda Functions**

Your Supabase Edge Functions need to be converted to Lambda functions. Each function becomes a separate Lambda:
- `analyze-url` → Lambda function
- `analyze-image` → Lambda function  
- `generate-embedding` → Lambda function
- etc.

**4.2 Create Lambda Functions**

For each edge function:

1. **Package the function**:
   ```bash
   cd supabase/functions/analyze-url
   npm install
   zip -r function.zip .
   ```

2. **Create Lambda via Console**:
   - Go to https://console.aws.amazon.com/lambda/
   - Click "Create function"
   - Choose "Author from scratch"
   - Function name: `laterr-garden-analyze-url`
   - Runtime: Node.js 18.x (or 20.x)
   - Click "Create function"

3. **Upload code**:
   - In the Lambda function page
   - Code source → Upload from → .zip file
   - Upload your function.zip

4. **Configure environment variables**:
   - Configuration → Environment variables
   - Add:
     - `OPENAI_API_KEY`: your OpenAI key
     - `DB_HOST`: your RDS endpoint
     - `DB_PASSWORD`: your database password
     - `S3_BUCKET`: laterr-garden-uploads

5. **Set up API Gateway trigger**:
   - Add trigger → API Gateway
   - Create new REST API
   - Security: API key (or IAM for production)
   - Copy the API endpoint URL

**4.3 Create Lambda Layer for Dependencies**

If your functions share dependencies:
```bash
mkdir nodejs
npm install --prefix nodejs pg @supabase/supabase-js
zip -r layer.zip nodejs
aws lambda publish-layer-version \
  --layer-name laterr-garden-dependencies \
  --zip-file fileb://layer.zip \
  --compatible-runtimes nodejs18.x
```

#### Step 5: Deploy Frontend (Option A: AWS Amplify)

**5.1 Set Up Amplify**

1. **Go to AWS Amplify Console**: https://console.aws.amazon.com/amplify/

2. **Connect Repository**:
   - Click "New app" → "Host web app"
   - Choose your Git provider (GitHub)
   - Authorize AWS Amplify
   - Select your repository
   - Select branch (usually `main`)

3. **Configure Build Settings**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

4. **Add Environment Variables**:
   - In Amplify app settings
   - Environment variables
   - Add:
     - `VITE_SUPABASE_URL`: Your RDS connection string
     - `VITE_SUPABASE_ANON_KEY`: Your API key
     - `VITE_API_GATEWAY_URL`: Your API Gateway URL

5. **Deploy**:
   - Click "Save and deploy"
   - Wait for build to complete
   - Get your Amplify URL

#### Step 5: Deploy Frontend (Option B: S3 + CloudFront)

**5.1 Build Your App**

```bash
cd /path/to/laterr-garden-thoughts
npm run build
```

**5.2 Upload to S3**

```bash
aws s3 sync dist/ s3://laterr-garden-static --delete
```

**5.3 Configure S3 for Static Hosting**

1. Go to S3 bucket → Properties
2. Static website hosting → Enable
3. Index document: `index.html`
4. Error document: `index.html` (for SPA routing)

**5.4 Create CloudFront Distribution**

1. Go to CloudFront console
2. Create distribution
3. Origin domain: Select your S3 bucket
4. Origin path: leave empty
5. Viewer protocol policy: Redirect HTTP to HTTPS
6. Allowed HTTP methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
7. Cache policy: CachingOptimized
8. Create distribution

**5.5 Update DNS** (if using custom domain)

1. Add CNAME record pointing to CloudFront distribution
2. Or use Route 53 for full AWS integration

#### Step 6: Update Application Configuration

**6.1 Update Frontend Environment Variables**

Create or update `.env` file:
```env
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com
VITE_S3_BUCKET=laterr-garden-uploads
VITE_REGION=us-east-1
```

**6.2 Update Database Connection**

Update `src/integrations/supabase/client.ts` to use your RDS:
```typescript
import { createClient } from '@supabase/supabase-js';

// Replace with your RDS connection details
const DB_URL = import.meta.env.VITE_DB_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export const supabase = createClient(DB_URL, API_KEY);
```

#### Step 7: Testing

**7.1 Test Database Connection**
```bash
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d postgres -c "SELECT COUNT(*) FROM items;"
```

**7.2 Test Lambda Functions**
- Use API Gateway test feature
- Or use curl:
  ```bash
  curl -X POST https://your-api-gateway-url/analyze-url \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
  ```

**7.3 Test Frontend**
- Visit your Amplify or CloudFront URL
- Test all features:
  - Adding URLs
  - Uploading images
  - Search functionality
  - Tag generation

#### Step 8: Set Up Monitoring

**8.1 CloudWatch Logs**

All Lambda functions automatically log to CloudWatch:
- Go to CloudWatch → Log groups
- Find `/aws/lambda/laterr-garden-*`
- Set up log retention (30 days recommended)

**8.2 CloudWatch Alarms**

Set up alarms for:
- Lambda errors
- Database connections
- API Gateway 5xx errors

**8.3 RDS Monitoring**

- Go to RDS → your database → Monitoring
- Enable Enhanced Monitoring
- Set up alerts for:
  - CPU utilization > 80%
  - Free storage < 10GB
  - Connection count approaching limit

### AWS Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTPS
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              AWS CloudFront (CDN)                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │
┌─────────────────▼───────────────────────────────────────────┐
│         S3 Bucket (Static Website)                           │
│         - React App                                          │
│         - HTML/CSS/JS                                        │
└──────────────────────────────────────────────────────────────┘
                  │
                  │ API Calls
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              API Gateway                                     │
└────┬────────────┬─────────────┬────────────┬────────────────┘
     │            │             │            │
     │            │             │            │
┌────▼─────┐ ┌───▼──────┐ ┌───▼──────┐ ┌──▼──────────┐
│ Lambda   │ │ Lambda   │ │ Lambda   │ │ Lambda      │
│ analyze- │ │ analyze- │ │ generate-│ │ generate-   │
│ url      │ │ image    │ │ embedding│ │ tag-icon    │
└────┬─────┘ └───┬──────┘ └───┬──────┘ └──┬──────────┘
     │           │            │            │
     └───────────┴────────────┴────────────┘
                  │
                  │ Database Queries
                  │
┌─────────────────▼───────────────────────────────────────────┐
│         Amazon RDS (PostgreSQL + pgvector)                   │
│         - items table                                        │
│         - categories table                                   │
│         - tag_icons table                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│         Amazon S3 (File Storage)                             │
│         - laterr-garden-uploads (images, files)              │
│         - laterr-garden-thumbnails                           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│         External: OpenAI API                                 │
│         - Embeddings                                         │
│         - Content Analysis                                   │
└──────────────────────────────────────────────────────────────┘
```

### AWS Estimated Monthly Costs

**Small Usage (< 1000 users/month)**:
- RDS db.t3.micro: ~$15/month
- S3 storage (10GB): ~$0.23/month
- CloudFront: ~$1-5/month
- Lambda (1M requests): ~$0.20/month
- API Gateway: ~$3.50/month
- **Total: ~$20-25/month**

**Medium Usage (< 10,000 users/month)**:
- RDS db.t3.small: ~$30/month
- S3 storage (50GB): ~$1.15/month
- CloudFront: ~$10-20/month
- Lambda (10M requests): ~$2/month
- API Gateway: ~$35/month
- **Total: ~$80-90/month**

**Note**: OpenAI costs are separate and depend on usage.

---

## Google Cloud Migration Path

### Overview

Google Cloud equivalent services:
- **Lovable** → **Firebase Hosting** or **Cloud Storage + CDN**
- **Supabase Database** → **Cloud SQL (PostgreSQL)**
- **Supabase Edge Functions** → **Cloud Functions** or **Cloud Run**
- **Supabase Storage** → **Cloud Storage**
- **Supabase Auth** → **Firebase Authentication**

### Prerequisites

Before starting:
- Google Cloud account (sign up at cloud.google.com)
- gcloud CLI installed
- Your OpenAI API key
- Basic command line knowledge

### Step-by-Step Google Cloud Migration

#### Step 1: Set Up Google Cloud Account

1. **Create Google Cloud Account**
   - Go to https://cloud.google.com
   - Click "Get started for free"
   - $300 free credit for new users
   - Set up billing (required even for free tier)

2. **Create a New Project**
   - Go to Cloud Console: https://console.cloud.google.com
   - Click "Select a project" → "New Project"
   - Project name: `laterr-garden`
   - Project ID: `laterr-garden-[unique-id]`
   - Click "Create"

3. **Install gcloud CLI**
   ```bash
   # For Mac/Linux
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # For Windows
   # Download from: https://cloud.google.com/sdk/docs/install
   ```

4. **Initialize gcloud**
   ```bash
   gcloud init
   gcloud auth login
   gcloud config set project laterr-garden-[your-project-id]
   ```

#### Step 2: Migrate the Database

**2.1 Export Data from Supabase** (same as AWS section)

1. Download database backup from Supabase
2. Export tables to CSV files

**2.2 Create Cloud SQL Instance**

1. **Enable Cloud SQL API**:
   ```bash
   gcloud services enable sqladmin.googleapis.com
   ```

2. **Create PostgreSQL Instance**:
   ```bash
   gcloud sql instances create laterr-garden-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1 \
     --root-password=[YOUR-STRONG-PASSWORD]
   ```
   
   Or use the Console:
   - Go to https://console.cloud.google.com/sql
   - Click "Create Instance"
   - Choose PostgreSQL
   - Instance ID: `laterr-garden-db`
   - Password: (create strong password)
   - Choose region close to your users
   - Configuration: Start with `db-f1-micro` (upgradable)
   - Storage: 10GB SSD

3. **Configure Connection**:
   ```bash
   # Allow your IP for testing
   gcloud sql instances patch laterr-garden-db \
     --authorized-networks=[YOUR-IP-ADDRESS]
   ```

4. **Create Database**:
   ```bash
   gcloud sql databases create laterrdb \
     --instance=laterr-garden-db
   ```

**2.3 Install pgvector Extension**

1. Connect to Cloud SQL:
   ```bash
   gcloud sql connect laterr-garden-db --user=postgres
   ```

2. Install pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

**2.4 Run Migrations and Import Data**

1. Install Cloud SQL Proxy:
   ```bash
   curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.6.1/cloud-sql-proxy.darwin.amd64
   chmod +x cloud-sql-proxy
   ```

2. Start proxy:
   ```bash
   ./cloud-sql-proxy laterr-garden-[project-id]:us-central1:laterr-garden-db
   ```

3. Run migrations:
   ```bash
   psql -h localhost -U postgres -d laterrdb -f supabase/migrations/*.sql
   ```

4. Import data:
   ```bash
   psql -h localhost -U postgres -d laterrdb
   \copy categories FROM 'categories.csv' CSV HEADER;
   \copy items FROM 'items.csv' CSV HEADER;
   \copy tag_icons FROM 'tag_icons.csv' CSV HEADER;
   ```

#### Step 3: Set Up File Storage (Cloud Storage)

**3.1 Create Storage Buckets**

```bash
# Enable Cloud Storage API
gcloud services enable storage.googleapis.com

# Create buckets
gsutil mb gs://laterr-garden-uploads/
gsutil mb gs://laterr-garden-thumbnails/
gsutil mb gs://laterr-garden-static/
```

**3.2 Configure CORS**

Create `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "ETag"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
gsutil cors set cors.json gs://laterr-garden-uploads/
```

**3.3 Set Permissions**

```bash
# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://laterr-garden-uploads
```

**3.4 Migrate Files from Supabase**

```bash
# Upload files
gsutil -m cp -r ./local-backup/* gs://laterr-garden-uploads/
```

#### Step 4: Deploy Backend Functions (Cloud Functions)

**4.1 Enable Required APIs**

```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

**4.2 Deploy Cloud Functions**

For each Supabase edge function, create a Cloud Function:

1. **Prepare function directory**:
   ```bash
   cd supabase/functions/analyze-url
   ```

2. **Create package.json** (if not exists):
   ```json
   {
     "name": "analyze-url",
     "version": "1.0.0",
     "main": "index.js",
     "dependencies": {
       "@google-cloud/functions-framework": "^3.0.0",
       "openai": "^4.0.0",
       "linkedom": "^0.18.5",
       "@mozilla/readability": "^0.5.0"
     }
   }
   ```

3. **Convert Deno code to Node.js**:
   
   Original Deno code uses:
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
   ```
   
   Convert to Node.js:
   ```javascript
   const functions = require('@google-cloud/functions-framework');
   
   functions.http('analyzeUrl', async (req, res) => {
     // Set CORS headers
     res.set('Access-Control-Allow-Origin', '*');
     
     if (req.method === 'OPTIONS') {
       res.set('Access-Control-Allow-Methods', 'POST');
       res.set('Access-Control-Allow-Headers', 'Content-Type');
       res.status(204).send('');
       return;
     }
     
     // Your function logic here
     const { url } = req.body;
     // ... rest of your code
   });
   ```

4. **Deploy the function**:
   ```bash
   gcloud functions deploy analyze-url \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point analyzeUrl \
     --set-env-vars OPENAI_API_KEY=[your-key],DB_HOST=[cloud-sql-connection]
   ```

5. **Repeat for each function**:
   - `analyze-image`
   - `analyze-file`
   - `generate-embedding`
   - `generate-tag-icon`

**4.3 Connect Cloud Functions to Cloud SQL**

For functions that need database access:
```bash
gcloud functions deploy function-name \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars DB_HOST=/cloudsql/[PROJECT-ID]:[REGION]:[INSTANCE-NAME] \
  --vpc-connector [CONNECTOR-NAME]
```

#### Step 5: Deploy Frontend (Option A: Firebase Hosting)

**5.1 Set Up Firebase**

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase**:
   ```bash
   cd /path/to/laterr-garden-thoughts
   firebase init
   ```
   
   Select:
   - Hosting
   - Use existing project: `laterr-garden`
   - Public directory: `dist`
   - Single-page app: Yes
   - Set up automatic builds: No (for now)

**5.2 Build and Deploy**

1. **Build your app**:
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase deploy --only hosting
   ```

3. **Get your URL**:
   - Firebase will provide a URL like: `https://laterr-garden.web.app`
   - Or set up custom domain in Firebase console

#### Step 5: Deploy Frontend (Option B: Cloud Storage + CDN)

**5.1 Build and Upload**

```bash
# Build app
npm run build

# Upload to Cloud Storage
gsutil -m cp -r dist/* gs://laterr-garden-static/
```

**5.2 Configure Static Website**

```bash
gsutil web set -m index.html -e index.html gs://laterr-garden-static
```

**5.3 Set Up Cloud CDN**

1. Create backend bucket:
   ```bash
   gcloud compute backend-buckets create laterr-backend \
     --gcs-bucket-name=laterr-garden-static \
     --enable-cdn
   ```

2. Create URL map:
   ```bash
   gcloud compute url-maps create laterr-map \
     --default-backend-bucket=laterr-backend
   ```

3. Create target HTTP proxy:
   ```bash
   gcloud compute target-http-proxies create laterr-proxy \
     --url-map=laterr-map
   ```

4. Create forwarding rule:
   ```bash
   gcloud compute forwarding-rules create laterr-rule \
     --global \
     --target-http-proxy=laterr-proxy \
     --ports=80
   ```

#### Step 6: Update Application Configuration

**6.1 Create Environment Variables**

Create `.env.production`:
```env
VITE_DB_URL=https://[cloud-sql-ip]:5432/laterrdb
VITE_API_URL=https://us-central1-laterr-garden.cloudfunctions.net
VITE_STORAGE_BUCKET=laterr-garden-uploads
VITE_PROJECT_ID=laterr-garden
```

**6.2 Update Frontend Code**

Update API calls to use Cloud Functions URLs:
```typescript
// src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL;

export const API_ENDPOINTS = {
  analyzeUrl: `${API_BASE_URL}/analyze-url`,
  analyzeImage: `${API_BASE_URL}/analyze-image`,
  generateEmbedding: `${API_BASE_URL}/generate-embedding`,
  // ... etc
};
```

#### Step 7: Testing

**7.1 Test Database**
```bash
gcloud sql connect laterr-garden-db --user=postgres
SELECT COUNT(*) FROM items;
```

**7.2 Test Cloud Functions**
```bash
curl -X POST \
  https://us-central1-laterr-garden.cloudfunctions.net/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**7.3 Test Frontend**
- Visit your Firebase or CDN URL
- Test all features
- Check browser console for errors

#### Step 8: Set Up Monitoring

**8.1 Cloud Logging**

All Cloud Functions automatically log:
- Go to Cloud Console → Logging
- Filter by resource: Cloud Function
- Set up log-based metrics

**8.2 Cloud Monitoring**

1. Go to Monitoring dashboard
2. Create alerts for:
   - Function errors > 1%
   - Database CPU > 80%
   - Storage operations failures

**8.3 Uptime Checks**

Create uptime checks:
```bash
gcloud monitoring uptime-checks create https://your-app-url.web.app \
  --display-name="Laterr Garden Uptime"
```

### Google Cloud Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTPS
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Firebase Hosting / Cloud CDN                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │
┌─────────────────▼───────────────────────────────────────────┐
│         Cloud Storage (Static Website)                       │
│         - React App                                          │
│         - HTML/CSS/JS                                        │
└──────────────────────────────────────────────────────────────┘
                  │
                  │ API Calls
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Cloud Functions / Cloud Run                     │
├────┬────────────┬─────────────┬────────────┬────────────────┤
│CF: │ CF:        │ CF:         │ CF:        │                │
│analyze-url     │analyze-image│generate-   │generate-tag-icon│
│                │             │embedding   │                │
└────┬─────────────┴─────────────┴────────────┴────────────────┘
     │
     │ Database Connection
     │
┌────▼──────────────────────────────────────────────────────────┐
│         Cloud SQL (PostgreSQL + pgvector)                     │
│         - items table                                         │
│         - categories table                                    │
│         - tag_icons table                                     │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│         Cloud Storage (File Storage)                          │
│         - laterr-garden-uploads (images, files)               │
│         - laterr-garden-thumbnails                            │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│         External: OpenAI API                                  │
│         - Embeddings                                          │
│         - Content Analysis                                    │
└───────────────────────────────────────────────────────────────┘
```

### Google Cloud Estimated Monthly Costs

**Small Usage (< 1000 users/month)**:
- Cloud SQL db-f1-micro: ~$7/month
- Cloud Storage (10GB): ~$0.20/month
- Cloud Functions (1M invocations): ~$0.40/month
- Firebase Hosting: Free tier
- Cloud CDN: ~$1-3/month
- **Total: ~$10-15/month**

**Medium Usage (< 10,000 users/month)**:
- Cloud SQL db-g1-small: ~$25/month
- Cloud Storage (50GB): ~$1/month
- Cloud Functions (10M invocations): ~$4/month
- Firebase Hosting: ~$5/month
- Cloud CDN: ~$10-15/month
- **Total: ~$45-50/month**

**Note**: Google Cloud is generally cheaper than AWS for this use case.

---

## Cost Comparison

### Current Setup (Lovable + Supabase)

- **Lovable**: ~$20/month (if on paid plan)
- **Supabase**: $25/month (Pro plan) or $0 (Free tier with limits)
- **OpenAI**: Variable based on usage (~$10-50/month)
- **Total**: ~$35-70/month

### AWS

- **Small scale**: ~$20-25/month + OpenAI
- **Medium scale**: ~$80-90/month + OpenAI
- **Pros**: 
  - Mature ecosystem
  - Most services available
  - Best documentation
- **Cons**: 
  - Complex pricing
  - Steeper learning curve
  - More expensive at scale

### Google Cloud

- **Small scale**: ~$10-15/month + OpenAI
- **Medium scale**: ~$45-50/month + OpenAI
- **Pros**: 
  - Lower costs
  - Generous free tier
  - Simpler pricing
  - Great for this stack
- **Cons**: 
  - Smaller market share
  - Fewer third-party integrations

### Recommendation

**For your use case (Laterr Garden)**:
- **Start with**: Google Cloud (cheaper, simpler)
- **Scale to**: AWS if you need specific services
- **Stay with**: Lovable + Supabase if happy with current setup

**Decision factors**:
- If cost is primary concern → **Google Cloud**
- If you need enterprise features → **AWS**
- If you want simplicity → **Stay with Lovable + Supabase**

---

## Non-Programmer Guide

### Understanding the Migration in Simple Terms

Think of your app like a house:
- **Frontend (React)**: The visible part - rooms, paint, furniture
- **Database**: The filing cabinet where you keep records
- **Backend Functions**: The utilities - plumbing, electricity
- **File Storage**: The garage where you store big items
- **Hosting**: The land where your house sits

**Current Setup**:
- Your house (app) sits on Lovable's land
- You rent a storage unit (Supabase) that has:
  - A filing cabinet (database)
  - A garage (file storage)
  - Utilities (backend functions)

**After Migration**:
- Your house moves to AWS or Google Cloud's land
- You bring your own filing cabinet, garage, and utilities
- Everything works the same, just in a new location

### When Should You Migrate?

**Reasons TO migrate**:
1. **Cost**: You're spending a lot on Lovable + Supabase
2. **Control**: You need specific configurations
3. **Scale**: You're growing fast
4. **Compliance**: Legal requirements for data location
5. **Integration**: You already use AWS/GCP for other services

**Reasons NOT TO migrate**:
1. **Works well**: Current setup meets your needs
2. **Time**: Migration takes days/weeks
3. **Complexity**: You'll need to manage more things
4. **Support**: Lovable + Supabase have great support

### Do I Need a Programmer?

**For AWS migration**: **Yes, strongly recommended**
- Complex setup process
- Many configuration options
- Easy to make costly mistakes

**For Google Cloud migration**: **Maybe**
- Simpler than AWS
- Better documentation
- More forgiving pricing

**What they'll do**:
1. Export your data safely
2. Set up new infrastructure
3. Convert backend functions
4. Deploy and test everything
5. Monitor for issues

**Estimated time**: 
- Simple migration: 2-3 days
- With testing: 5-7 days
- With optimization: 1-2 weeks

**Estimated cost** (hiring developer):
- Freelancer: $500-2000
- Agency: $2000-5000

### Questions to Ask Before Migrating

1. **Why am I migrating?**
   - Be clear about your reasons
   - Quantify the benefits

2. **What's my budget?**
   - Migration cost (one-time)
   - Monthly hosting cost
   - Developer cost

3. **Can I handle the complexity?**
   - AWS/GCP require technical knowledge
   - More things to monitor
   - More things that can break

4. **Do I have a backup plan?**
   - What if migration fails?
   - Can I roll back?
   - Do I have complete backups?

5. **Who will maintain it?**
   - Do I have ongoing developer support?
   - Can I handle issues myself?
   - What's my support plan?

### Alternatives to Full Migration

Instead of moving everything, consider:

**Option 1: Hybrid Approach**
- Keep database on Supabase
- Move hosting to AWS/GCP
- Gradual migration

**Option 2: Optimize Current Setup**
- Review your Supabase usage
- Optimize queries
- Clean up unused data
- May be cheaper than migrating

**Option 3: Different Provider**
- Consider Vercel (similar to Lovable)
- Consider PlanetScale (database)
- Consider Netlify (hosting)
- May be simpler than AWS/GCP

---

## Troubleshooting

### Common Migration Issues

#### Database Connection Issues

**Problem**: Can't connect to new database

**Solutions**:
- Check security group/firewall rules
- Verify IP whitelist
- Test with `psql` or database client
- Check credentials and connection string

**AWS**:
```bash
# Test connection
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d postgres
```

**Google Cloud**:
```bash
# Use Cloud SQL Proxy
./cloud-sql-proxy project:region:instance
psql -h localhost -U postgres
```

#### Backend Functions Not Working

**Problem**: Lambda/Cloud Functions returning errors

**Solutions**:
- Check function logs
- Verify environment variables
- Test function locally first
- Check API Gateway configuration

**AWS CloudWatch**:
```bash
aws logs tail /aws/lambda/function-name --follow
```

**Google Cloud Logging**:
```bash
gcloud functions logs read function-name --limit 50
```

#### Frontend Not Loading

**Problem**: White screen or errors

**Solutions**:
- Check browser console
- Verify API endpoints in environment variables
- Check CORS configuration
- Rebuild and redeploy

**Debug steps**:
```bash
# Check build
npm run build

# Test locally
npm run preview

# Check environment variables
cat .env.production
```

#### File Upload Issues

**Problem**: Can't upload images/files

**Solutions**:
- Check bucket permissions
- Verify CORS configuration
- Check bucket policy
- Test with curl

**AWS S3**:
```bash
aws s3 ls s3://your-bucket/
aws s3 cp test-file.jpg s3://your-bucket/
```

**Google Cloud Storage**:
```bash
gsutil ls gs://your-bucket/
gsutil cp test-file.jpg gs://your-bucket/
```

#### pgvector Extension Issues

**Problem**: Embeddings not working

**Solutions**:
```sql
-- Check if extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Install if missing
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify vector column exists
\d items
```

#### High Costs

**Problem**: Unexpected high bills

**Solutions**:
- Review CloudWatch/Cloud Monitoring
- Check for excessive function calls
- Look for large data transfers
- Review database query patterns

**AWS**:
- Use Cost Explorer
- Set up billing alerts
- Check for zombie resources

**Google Cloud**:
- Use Billing reports
- Set budget alerts
- Review recommender suggestions

### Getting Help

#### AWS Support

- Documentation: https://docs.aws.amazon.com/
- Forums: https://repost.aws/
- Support tiers: Basic (free) to Enterprise ($15k/month)
- Stack Overflow: Tag with `amazon-web-services`

#### Google Cloud Support

- Documentation: https://cloud.google.com/docs
- Community: https://www.googlecloudcommunity.com/
- Support tiers: Basic (free) to Enterprise ($30k/month)
- Stack Overflow: Tag with `google-cloud-platform`

#### Useful Commands

**Check what's running (AWS)**:
```bash
# List all RDS instances
aws rds describe-db-instances

# List Lambda functions
aws lambda list-functions

# List S3 buckets
aws s3 ls
```

**Check what's running (Google Cloud)**:
```bash
# List Cloud SQL instances
gcloud sql instances list

# List Cloud Functions
gcloud functions list

# List storage buckets
gsutil ls
```

---

## Maintenance After Migration

### Regular Tasks

**Daily**:
- Monitor error rates
- Check function execution logs

**Weekly**:
- Review costs
- Check database performance
- Review storage usage

**Monthly**:
- Update dependencies
- Review security policies
- Optimize costs
- Database backup verification

### Security Best Practices

1. **Use IAM roles** instead of access keys
2. **Enable encryption** at rest and in transit
3. **Set up VPC** for database isolation
4. **Regular backups** with point-in-time recovery
5. **Monitor access logs**
6. **Use secrets manager** for API keys
7. **Regular security patches**
8. **Enable MFA** for console access

### Scaling Considerations

**When to scale up**:
- Database CPU consistently > 70%
- Function timeouts increasing
- Slow response times
- Storage approaching limits

**How to scale**:
- **Database**: Increase instance size
- **Functions**: Increase memory/timeout
- **Storage**: Enable auto-scaling
- **CDN**: Increase cache TTL

### Backup Strategy

**AWS**:
```bash
# Enable automated backups
aws rds modify-db-instance \
  --db-instance-identifier laterr-garden-db \
  --backup-retention-period 7

# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier laterr-garden-db \
  --db-snapshot-identifier laterr-backup-$(date +%Y%m%d)
```

**Google Cloud**:
```bash
# Enable automated backups
gcloud sql instances patch laterr-garden-db \
  --backup-start-time=02:00

# Manual backup
gcloud sql backups create \
  --instance=laterr-garden-db \
  --description="Manual backup"
```

---

## Conclusion

Migrating from Lovable + Supabase to AWS or Google Cloud is a significant undertaking but can provide:
- **Cost savings** (especially GCP)
- **More control** over infrastructure
- **Better integration** with other cloud services
- **Enterprise features** for scaling

**Key Takeaways**:
1. **Understand your reasons** for migrating
2. **Google Cloud is simpler** and cheaper for this use case
3. **AWS offers more features** but higher complexity
4. **Budget for both migration and ongoing costs**
5. **Have a rollback plan**
6. **Test thoroughly** before going live
7. **Consider hiring help** for first migration

**Next Steps**:
1. Review this guide thoroughly
2. Decide between AWS and Google Cloud
3. Create detailed migration timeline
4. Back up all current data
5. Set up new infrastructure in parallel
6. Test everything multiple times
7. Gradually migrate traffic
8. Monitor closely for first month

Good luck with your migration! Remember: you can always ask for help in cloud provider forums or hire a consultant for the complex parts.
