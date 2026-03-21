# OpenCLI Command Reference

All commands follow the pattern: `opencli <platform> <subcommand> [options] -f <format>`

Auth tiers: `public` (no login), `cookie` (browser cookies), `header` (CSRF/auth headers), `intercept` (XHR intercept), `ui` (full UI automation).

## Social Media

| Platform | Command | Auth | Description |
|----------|---------|------|-------------|
| Twitter/X | `opencli twitter` | header | Timeline, search, profile, trending |
| Reddit | `opencli reddit` | cookie | Hot, top, new, search by subreddit |
| Weibo | `opencli weibo` | cookie | Chinese microblogging |
| Jike | `opencli jike` | cookie | Chinese social network |
| V2EX | `opencli v2ex` | public | Developer community forum |
| Linux.do | `opencli linux-do` | cookie | Linux community forum |
| Xiaohongshu | `opencli xiaohongshu` | intercept | Chinese lifestyle platform |
| WeChat | `opencli wechat` | cookie | WeChat public accounts |

### Twitter Examples

```bash
opencli twitter timeline -f json              # Home timeline
opencli twitter search "AI agents" -f json    # Search tweets
opencli twitter profile @anthropic -f json    # User profile
opencli twitter trending -f json              # Trending topics
```

### Reddit Examples

```bash
opencli reddit hot -f json                              # Front page
opencli reddit hot --subreddit "MachineLearning" -f json  # Subreddit hot
opencli reddit top --subreddit "ClaudeAI" -f json       # Top posts
opencli reddit search "query" -f json                   # Search
```

## News and Knowledge

| Platform | Command | Auth | Description |
|----------|---------|------|-------------|
| HackerNews | `opencli hackernews` | public | Top, new, best, ask, show, jobs |
| Wikipedia | `opencli wikipedia` | public | Search and article content |
| ArXiv | `opencli arxiv` | public | Paper search and metadata |
| StackOverflow | `opencli stackoverflow` | public | Question search and answers |
| Zhihu | `opencli zhihu` | cookie | Chinese Q&A platform |

### HackerNews Examples

```bash
opencli hackernews top -f json --limit 30     # Front page stories
opencli hackernews new -f json --limit 10     # Newest stories
opencli hackernews best -f json               # Best stories
opencli hackernews search "Claude" -f json    # Search HN
```

## Video

| Platform | Command | Auth | Description |
|----------|---------|------|-------------|
| YouTube | `opencli youtube` | cookie | Trending, search, channel |
| Bilibili | `opencli bilibili` | cookie | Chinese video platform |

### YouTube Examples

```bash
opencli youtube trending -f json              # Trending videos
opencli youtube search "Claude Code" -f json  # Search videos
```

## Finance

| Platform | Command | Auth | Description |
|----------|---------|------|-------------|
| Yahoo Finance | `opencli yahoo-finance` | public | Quotes, charts, news |
| Barchart | `opencli barchart` | public | Commodities, futures |
| Bloomberg | `opencli bloomberg` | cookie | Financial news and data |
| Reuters | `opencli reuters` | public | News wire |
| Xueqiu | `opencli xueqiu` | cookie | Chinese stock market |
| Sina Finance | `opencli sinafinance` | cookie | Chinese financial data |

### Finance Examples

```bash
opencli yahoo-finance quote AAPL -f json      # Stock quote
opencli yahoo-finance news TSLA -f json       # Stock news
opencli bloomberg markets -f json             # Market overview
opencli reuters top -f json                   # Top news
```

## Shopping and Jobs

| Platform | Command | Auth | Description |
|----------|---------|------|-------------|
| Steam | `opencli steam` | public | Game store, deals |
| Coupang | `opencli coupang` | cookie | Korean e-commerce |
| BOSS Zhipin | `opencli boss` | cookie | Chinese job platform |
| SMZDM | `opencli smzdm` | public | Chinese deals aggregator |
| Ctrip | `opencli ctrip` | cookie | Chinese travel booking |

## Reading

| Platform | Command | Auth | Description |
|----------|---------|------|-------------|
| WeRead | `opencli weread` | cookie | Weixin Reading (ebooks) |

## AI and ML

| Platform | Command | Auth | Description |
|----------|---------|------|-------------|
| HuggingFace | `opencli hf` | public | Models, datasets, spaces |
| ChatGPT | `opencli chatgpt` | ui | Chat interface |
| Grok | `opencli grok` | cookie | xAI chat interface |
| Codex | `opencli codex` | cookie | OpenAI Codex |

### HuggingFace Examples

```bash
opencli hf trending -f json                   # Trending models
opencli hf search "text-generation" -f json   # Search models
```

## Desktop Apps (CDP)

These connect to local Electron apps via Chrome DevTools Protocol.

| App | Command | Description |
|-----|---------|-------------|
| Cursor | `opencli cursor` | IDE control |
| Discord | `opencli discord-app` | Message channels |
| Notion | `opencli notion` | Pages and databases |
| AntiGravity | `opencli antigravity` | AntiGravity app |
| Feishu | `opencli feishu` | Lark/Feishu workspace |
| NetEase Music | `opencli neteasemusic` | Music player |
| Apple Podcasts | `opencli apple-podcasts` | Podcast player (macOS) |
| ChatWise | `opencli chatwise` | Chat client |
| Jimeng | `opencli jimeng` | Image generation |
| Xiaoyuzhou | `opencli xiaoyuzhou` | Podcast platform |

## External CLI Passthrough

These wrap existing CLIs with opencli's unified output formatting.

| CLI | Command | Wraps |
|-----|---------|-------|
| GitHub CLI | `opencli gh` | `gh` |
| Docker | `opencli docker` | `docker` |
| kubectl | `opencli kubectl` | `kubectl` |
| Obsidian | `opencli obsidian` | Obsidian CLI |
| Readwise | `opencli readwise` | Readwise API |
| Google Workspace | `opencli gws` | Google Workspace CLI |

## Common Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--format` | `-f` | Output format: table, json, yaml, md, csv |
| `--limit` | | Max results to return |
| `--help` | `-h` | Command help |
