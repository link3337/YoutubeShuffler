# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## download [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)

```
yt-dlp --flat-playlist -J "PLAYLIST_URL" > playlist.json
```

## Twitch chat song requests

- Open the app and use the **Twitch song requests** card.
- Generate an OAUTH token and set it, press connect to chat.

### Generate a Twitch token (chat:read + chat:edit)

1. Go to https://twitchtokengenerator.com/.
2. Under **Bot Chat Token**, click **Generate Token**.
3. Sign in with the Twitch account you want the app to use in chat.
4. On the permissions/scopes page, make sure these are checked:
	- `chat:read`
	- `chat:edit`
	- `user:read:chat`
	- `user:write:chat`
5. Approve the authorization request.
6. Copy the generated token (it usually looks like `oauth:xxxxxxxx...`).
7. In this app's **Twitch song requests** card:
	- Set your Twitch channel/user name.
	- Paste the token into the OAuth token field.
	- Click **Connect**.

Notes:
- Keep this token private. It can post/read chat as that account.
- If your token does not start with `oauth:`, prepend `oauth:` before pasting.
- If connect fails, generate a new token and verify all scopes are selected.

```
!sr https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

or

```
!songrequest dQw4w9WgXcQ
```
