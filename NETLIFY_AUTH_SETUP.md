# GitHub Authentication Setup Guide for DecapCMS

## Prerequisites
- Your site is deployed on Netlify (or any static host)
- You have admin access to your GitHub repository
- You have access to create OAuth Apps in your GitHub account/organization

## Step 1: Create a GitHub OAuth App

1. Go to your GitHub Settings:
   - For personal repos: [https://github.com/settings/developers](https://github.com/settings/developers)
   - For organization repos: `https://github.com/organizations/YOUR_ORG/settings/applications`

2. Click **"New OAuth App"** (or **"Register a new application"**)

3. Fill in the application details:
   - **Application name**: `Learning Materials CMS` (or your preferred name)
   - **Homepage URL**: `https://your-site.netlify.app` (your actual site URL)
   - **Authorization callback URL**: `https://api.netlify.com/auth/done`
   
4. Click **"Register application"**

5. On the next page, note down:
   - **Client ID** (you'll need this)
   - Click **"Generate a new client secret"** and save it securely (you'll need this too)

## Step 2: Configure Netlify Environment Variables

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:
   - **Variable**: `GITHUB_CLIENT_ID`  
     **Value**: Your GitHub OAuth App Client ID
   - **Variable**: `GITHUB_CLIENT_SECRET`  
     **Value**: Your GitHub OAuth App Client Secret

4. Click **"Save"**

## Step 3: Enable Netlify's GitHub OAuth Provider

1. In your Netlify site dashboard, go to **Site settings** → **Access & security** → **OAuth**
2. Under **Authentication providers**, click **"Install provider"**
3. Select **GitHub**
4. Enter your GitHub OAuth App credentials:
   - Client ID
   - Client Secret
5. Click **"Install"**

## Step 4: Deploy Your Site

Your configuration files have been updated to use GitHub authentication:
- `public/admin/config.yml` now uses the `github` backend
- Netlify Identity widgets have been removed

Push your changes and deploy:
```bash
git add .
git commit -m "Switch to GitHub OAuth authentication"
git push origin main
```

## Step 5: Test the Setup

1. Visit your site at `https://your-site.netlify.app/admin`
2. You should see a **"Login with GitHub"** button
3. Click it to authenticate with your GitHub account
4. Grant access to the repository
5. You should now have access to the DecapCMS interface

## Configuration Files

The following files have been configured for GitHub authentication:

- **public/admin/config.yml**: GitHub backend configuration
- **netlify.toml**: Build and deployment settings (no Identity/Git Gateway)
- **public/admin/index.html**: DecapCMS interface (no Identity widget)
- **app.vue**: Main app (no Identity scripts)

## User Access Management

### Who Can Access the CMS?

With GitHub authentication, anyone with:
- A GitHub account
- **Write access** to your repository

Can log into the CMS and make changes.

### Managing Access

To control who can edit content:

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Collaborators** (for personal repos) or **Manage access** (for org repos)
3. Add collaborators with **Write** or **Maintain** access
4. Remove users who shouldn't have access

### Access Levels

- **Read**: Can view the repo but cannot use CMS
- **Write**: Can use CMS to create/edit content
- **Maintain**: Can use CMS and manage some repo settings
- **Admin**: Full access to everything

## Troubleshooting

### "Error: Failed to load config.yml"
- Check that `public/admin/config.yml` has the correct repo path
- Format should be: `owner/repository-name`

### "Login with GitHub" button doesn't appear
- Verify OAuth app callback URL is `https://api.netlify.com/auth/done`
- Check that Netlify environment variables are set correctly
- Clear browser cache and try again

### "Authentication Failed" error
- Verify Client ID and Client Secret match in both GitHub and Netlify
- Check that the OAuth app is enabled
- Ensure you have write access to the repository

### Changes not saving to GitHub
- Verify you have write access to the repository
- Check the branch name in `config.yml` matches your default branch
- Look for error messages in the browser console

## Local Development

For local development without authentication:

1. Install the DecapCMS proxy server:
   ```bash
   npm install -g decap-server
   ```

2. In `public/admin/config.yml`, uncomment:
   ```yaml
   local_backend: true
   ```

3. Run the proxy server:
   ```bash
   npx decap-server
   ```

4. Run your Nuxt dev server:
   ```bash
   npm run dev
   ```

5. Access the CMS at `http://localhost:3000/admin`

## Security Best Practices

1. **Never commit OAuth secrets** to your repository
2. **Use environment variables** for all sensitive credentials
3. **Regularly review** repository collaborators
4. **Enable 2FA** on GitHub accounts with repository access
5. **Rotate OAuth secrets** periodically
6. **Use branch protection** rules to require pull request reviews

## Support

For more information, visit:
- [DecapCMS Documentation](https://decapcms.org/docs/github-backend/)
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Netlify OAuth Provider Documentation](https://docs.netlify.com/visitor-access/oauth-provider-tokens/)
