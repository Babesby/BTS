# BTS GitHub Publishing Desk

The publishing desk is part of this codebase. It does not use OpenAI hosting or OpenAI storage.

## What is stored in GitHub

- Blog records: `dist/content/posts.json`
- Gallery records: `dist/content/gallery.json`
- Blog images: `dist/uploads/posts/`
- Gallery images: `dist/uploads/gallery/`

When an editor publishes, the API creates one GitHub commit containing the image and updated content file. A Git-connected deployment then rebuilds automatically.

## Required deployment setup

This repository needs a server-capable deployment such as Vercel, Render, Railway or a Node server. GitHub Pages alone cannot securely accept passwords or upload files because it only serves static files.

### Vercel

1. Push the complete project to GitHub.
2. Import the repository into Vercel. The included `vercel.json` serves `dist` and activates the publishing API.
3. Add these environment variables in the deployment settings:

   - `CMS_PASSWORD` = `7776`
   - `CMS_SESSION_SECRET` = a long random private value
   - `GITHUB_TOKEN` = a fine-grained GitHub token with **Contents: Read and write** permission for this repository only
   - `GITHUB_OWNER` = the GitHub user or organisation that owns the repository
   - `GITHUB_REPO` = the repository name
   - `GITHUB_BRANCH` = `main`
   - `GITHUB_SITE_DIR` = `dist`

4. Redeploy once after saving the variables.
5. Open `/manage.html` on the live domain and enter `7776`.

Never put the GitHub token or session secret into committed files. `.env.example` contains placeholders only.

## Local preview

Run `npm start`, then open `http://localhost:3000/manage.html`. Without GitHub variables, local publishing writes directly into `dist/content` and `dist/uploads`, making it easy to test before committing.
