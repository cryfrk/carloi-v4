# Carloi Product Blueprint

## Product Core
Carloi is a single ecosystem that merges:
- vehicle buy/sell marketplace
- social media feed
- AI assistant
- garage and OBD expertise
- messaging and negotiation
- insurance and payment operations
- admin control surface

The ecosystem runs as one product across:
- mobile app
- web client
- admin desktop app
- admin mobile app

## Platform Roles

### Mobile + Web
The mobile app and web client are the same consumer product:
- same account system
- same feed, listings, messaging, AI and garage logic
- platform-specific navigation only

### Admin
Admin is separated by role:
- `SUPER_ADMIN`
- `INSURANCE_ADMIN`
- `COMMERCIAL_ADMIN`

Admin desktop is the primary operations surface.
Admin mobile is a compact operational companion.

## Primary Information Architecture

### Consumer Bottom Navigation
Mobile bottom navigation order:
1. Home
2. Listings
3. Loi AI
4. Garage
5. Profile

### Mobile Top Bar
Visible only on:
- Home
- Listings
- Profile

Actions:
- left: create
- right cluster:
  - notifications
  - messages
- profile screen exception:
  - messages replaced by settings menu

### Web Dynamic Island
Compact icon-led bottom-center dock:
1. Home
2. Listings
3. Messages
4. Loi AI
5. Create
6. Notifications
7. Garage
8. Profile
9. Settings

## Auth Flow

### Login
Instagram-like minimal screen.
Identifier may be:
- phone
- email
- username

Must include:
- password
- forgot password
- sign up

### Register
Step-based flow:
1. choose account type
2. fill form
3. verify by Brevo email or SMS
4. enter app

#### Individual
Fields:
- first name
- last name
- username
- email or phone
- password

#### Commercial
Includes individual fields plus:
- company title
- TC identity no
- tax number

## Home Feed Rules
- Instagram-like full-width feed
- followed accounts always prioritized
- discovery and interest-based posts mixed in
- avoid repeating the same posts too often
- no boxed card-heavy layout
- thin separators between posts

Post structure:
- avatar
- username
- verification badge
- location
- media carousel
- like/comment/share/save actions
- like count
- comment count
- caption up to 600 chars
- first 3 lines collapsed
- expand with "devamini oku"
- created time shown

## Listings Rules
- marketplace-only stream
- location priority first
- filters for brand, model, package, price, city, district, seller type, km
- listing cards compact in stream
- rich listing detail with:
  - media gallery
  - seller profile block
  - 600-char description
  - auto-filled technical table
  - paint/replaced map
  - package equipment details
  - save/message/call actions

## Loi AI Rules
- AI assistant controls in-app search and guidance
- DeepSeek for lighter requests
- OpenAI for hard reasoning and vehicle analysis
- user can search:
  - users
  - listings
  - posts
  - compare listings
  - get seller question templates
  - generate listing descriptions

Chat UI should feel close to ChatGPT:
- multiline input
- attachment button
- voice message button
- send button
- conversation history

## Garage Rules
- multi-vehicle garage
- support different vehicle classes
- every garage vehicle can become a listing
- OBD flow:
  - discover nearby device
  - connect
  - 10-minute drive test
  - produce Carloi expertise report

## Profile Rules
- Instagram-style profile
- counts:
  - posts
  - listings
  - vehicles
  - followers
  - following
- bio
- website
- mentions
- tabs:
  - posts
  - listings
  - vehicles
- saved items only visible to owner
- account switching from profile tab long press

## Messaging Rules
- direct messages
- groups
- listing-based negotiation threads
- support:
  - attachments
  - audio
  - seen state
  - timestamps

Listing negotiation thread must support:
- "anlastik" flow
- license sharing
- insurance request handoff

## Legal + Compliance Rules
- individual listing limits must respect Turkish regulation
- users cannot sell vehicles they do not own
- license identity checks required
- commercial accounts need admin approval and compliance checks

## Design Direction
- mobile-first
- clean
- simple
- modern
- Instagram-like rhythm
- reduced heavy gradients
- strong spacing discipline
- white / neutral surfaces with selective accent usage
- compact icon-led navigation

## Delivery Principle
The repo should be revised in phases, but every phase must preserve:
- shared backend truth
- consistent auth/session behavior
- consumer parity between web and mobile
- admin role boundaries
