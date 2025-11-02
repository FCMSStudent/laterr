# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/28683ca3-713b-4aac-a657-44ab3b98e337

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/28683ca3-713b-4aac-a657-44ab3b98e337) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/28683ca3-713b-4aac-a657-44ab3b98e337) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Gradient Background

This app includes a fixed, masked radial gradient with a noise overlay for a soft, elegant visual effect.

### Theming
- Edit CSS variables in `src/styles/gradient.css`:
  - `--gradient-accent`, `--gradient-accent-2`: glow colors (HSL).
  - `--gradient-bg`: base page background.
- Dark mode is controlled by the `.dark` class on the root element; tune values in the `.dark` block.

### Toggling
- Add `.has-subtle-bg` to the `<body>` or a root wrapper to reduce intensity.
- To disable entirely on a view, conditionally render `GradientBackground`.

### Performance notes
- Keep `blur()` under ~40px for smoother performance on low-end devices.
- Layers are `position: fixed` with `pointer-events: none` and `z-index: -1`.

### Safari masking fallback
- Older Safari versions may ignore `mask-image`. If detection is necessary, reduce reliance on masking by slightly lowering gradient opacity and extending the base linear-gradient coverage.

