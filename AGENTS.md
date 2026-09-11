# Developer Agent Instructions

## Continuous Deployment to GitHub & Vercel
After making any functional changes, UI updates, bug fixes, or new features in the application, and after successfully validating via `compile_applet`, the agent MUST automatically execute `./sync-to-github.sh "Descriptive commit message"` using `run_command` before concluding the turn.

This ensures all work done in Google AI Studio is immediately pushed to the user's GitHub repository (`mlonjahussein-blip/App`), which in turn automatically triggers Vercel to rebuild and update the production website at `https://efootballaihub.com`.
