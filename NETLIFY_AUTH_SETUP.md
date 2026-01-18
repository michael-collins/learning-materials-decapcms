# Netlify Authentication Setup Guide

## Prerequisites
- Your site is deployed on Netlify
- You have admin access to your Netlify site

## Step 1: Enable Netlify Identity

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** > **Identity**
3. Click **Enable Identity**

## Step 2: Enable Git Gateway

1. In the Identity settings, scroll down to **Services**
2. Click **Enable Git Gateway**
3. This allows DecapCMS to commit changes to your repository

## Step 3: Configure Registration Settings

1. Under **Identity** > **Registration**, choose your preference:
   - **Invite only** (Recommended for private sites)
   - **Open** (Anyone can sign up)

2. Set **External providers** if you want to allow login via:
   - Google
   - GitHub
   - GitLab
   - Bitbucket

## Step 4: Invite Users (if using Invite Only)

1. Go to **Identity** tab in your Netlify site
2. Click **Invite users**
3. Enter email addresses of users who should have CMS access
4. They'll receive an email invitation

## Step 5: Test the Setup

1. Visit your site at `https://your-site.netlify.app/admin`
2. You should see the login screen
3. Sign up or log in with your Netlify Identity account
4. You should now have access to the DecapCMS interface

## Configuration Files Added

The following files have been configured for Netlify authentication:

- **netlify.toml**: Build and deployment configuration
- **public/admin/index.html**: Includes Netlify Identity widget
- **public/admin/config.yml**: Git Gateway backend configuration
- **app.vue**: Identity widget and redirect handling

## Troubleshooting

### Can't access /admin
- Make sure Identity is enabled in Netlify
- Check that Git Gateway is enabled
- Clear browser cache and try again

### Users can't sign up
- Check Registration settings (Invite only vs Open)
- Verify email invitations were sent
- Check spam folder for invitation emails

### Changes not saving
- Verify Git Gateway is enabled
- Check that the user has been invited/approved
- Ensure the GitHub repository permissions are correct

## Security Best Practices

1. **Use "Invite only" registration** for production sites
2. **Enable email confirmation** in Identity settings
3. **Set up external providers** for easier login
4. **Regularly review** active users in the Identity tab
5. **Use branch deploys** to preview changes before merging

## Support

For more information, visit:
- [Netlify Identity Documentation](https://docs.netlify.com/visitor-access/identity/)
- [DecapCMS Documentation](https://decapcms.org/docs/netlify-backend/)
