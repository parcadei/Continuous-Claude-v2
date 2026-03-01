# NorthStar Local Dev URL

When working on the NorthStar Transformation project, the local dev URL is:

**https://northstar.localhost/**

NOT `http://localhost:3000`. The project uses Caddy as a reverse proxy (`Caddyfile` + `npm run dev:caddy`).

Always use `https://northstar.localhost/` when:
- Opening the site in Chrome for review
- Referencing the local dev URL to the user
- Testing with browser automation tools
