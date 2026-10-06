/**
 * Documentation content model. Each feature is a `DocPage` rendered by
 * src/app/documentation/[slug]/page.tsx. Keeping content as data (not JSX)
 * keeps every doc page visually consistent and easy to extend.
 */

export type DocIcon =
  | 'network'
  | 'rocket'
  | 'layout-dashboard'
  | 'radar'
  | 'users'
  | 'mail'
  | 'phone'
  | 'calendar-clock'
  | 'bot'
  | 'message'
  | 'history'
  | 'settings'
  | 'user';

export interface DocCapability {
  title: string;
  text: string;
}

export interface DocSection {
  heading: string;
  body?: string[];
  capabilities?: DocCapability[];
  steps?: string[];
  code?: { caption?: string; lines: string[] };
  diagram?: { caption?: string; chart: string };
}

export interface DocPage {
  slug: string;
  title: string;
  tagline: string;
  icon: DocIcon;
  category: string;
  intro: string[];
  sections: DocSection[];
  tips?: string[];
  related?: string[];
}

export type DocTrack = 'User Documentation' | 'Technical Documentation';

export const DOC_CATEGORIES = [
  'Architecture',
  'Feature architecture',
  'Getting started',
  'Core features',
  'AI outreach',
  'Configuration',
] as const;

const DOC_TRACKS: readonly DocTrack[] = [
  'User Documentation',
  'Technical Documentation',
] as const;

const TECHNICAL_CATEGORIES = new Set<string>([
  'Architecture',
  'Feature architecture',
]);

const DIAGRAMS = {
  appTopology: String.raw`flowchart TB
  Operator["Operator browser"]
  subgraph FE["AgentReach-frontend - Next.js"]
    Routes["App Router pages"]
    Shell["AuthGuard + AppShell + Sidebar"]
    Query["TanStack Query"]
    Store["Zustand UI state"]
    Api["src/lib/api.ts"]
    LocalAuth["localAuth tokens + profile"]
    Docs["In-app documentation"]
  end
  subgraph BE["AgentReach-backend - NestJS"]
    Main["main.ts: /api, CORS, Swagger"]
    Guard["Global AuthGuard"]
    Modules["Feature modules"]
    Realtime["/twilio/stream WebSocket bridge"]
    Schedulers["Campaign + signal schedulers"]
    MongoSvc["MongoService delegates"]
  end
  subgraph DB["MongoDB"]
    Identity["Users + settings"]
    Audience["Contacts + directories"]
    Outreach["Templates + email campaigns"]
    Voice["Bots + calls"]
    SignalData["Watches + signals + playbooks"]
  end
  subgraph Providers["External providers"]
    SES["AWS SES"]
    Twilio["Twilio"]
    Gemini["Google Gemini text, embeddings, Live"]
    Feeds["News, EDGAR, job boards"]
  end
  Operator --> Routes
  Routes --> Shell
  Shell --> LocalAuth
  Routes --> Query
  Routes --> Store
  Query --> Api
  Docs --> Routes
  Api -->|"REST /api + Bearer token"| Main
  Main --> Guard
  Guard --> Modules
  Main -->|"HTTP upgrade"| Realtime
  Modules --> MongoSvc
  Schedulers --> Modules
  Realtime --> MongoSvc
  MongoSvc --> DB
  Modules --> SES
  Modules --> Gemini
  Modules --> Twilio
  Modules --> Feeds
  Realtime <-->|"live call audio"| Twilio
  Realtime <-->|"native audio session"| Gemini`,

  appRestFlow: String.raw`sequenceDiagram
  actor User as Operator
  participant Page as Dashboard Page
  participant Api as src/lib/api.ts
  participant Auth as localAuth
  participant API as NestJS /api
  participant Guard as AuthGuard
  participant Service as Feature Service
  participant DB as MongoDB
  User->>Page: Open authenticated route
  Page->>Api: Query or mutation
  Api->>Auth: Read access token
  Api->>API: Fetch with Bearer token
  API->>Guard: Verify token and user
  Guard->>Service: Allow request
  Service->>DB: Read or write through MongoService
  DB-->>Service: Documents
  Service-->>API: DTO response
  API-->>Api: JSON
  Api-->>Page: Typed result
  alt Access token expired
    Api->>API: POST /auth/refresh
    API-->>Api: New access + refresh tokens
    Api->>Auth: Save session
    Api->>API: Retry original request once
  end`,

  backendModules: String.raw`flowchart TB
  App["AppModule"]
  Mongo["MongoModule + MongoService"]
  Auth["AuthModule"]
  Settings["SettingsModule"]
  Contacts["ContactsModule"]
  Templates["TemplatesModule"]
  Email["EmailCampaignsModule"]
  Bots["BotModule"]
  Calling["CallingCampaignsModule"]
  Realtime["RealtimeCallingModule"]
  Signals["SignalsModule"]
  Scheduler["CampaignSchedulerModule"]
  History["HistoryModule"]
  Analytics["AnalyticsModule"]
  App --> Mongo
  App --> Auth
  App --> Settings
  App --> Contacts
  App --> Templates
  App --> Email
  App --> Bots
  App --> Calling
  App --> Realtime
  App --> Signals
  App --> Scheduler
  App --> History
  App --> Analytics
  Contacts --> Signals
  Email --> Templates
  Calling --> Bots
  Calling --> Realtime
  Signals --> Email
  Scheduler --> Email
  Scheduler --> Calling
  History --> Email
  History --> Calling
  Analytics --> Email
  Analytics --> Calling
  Auth --> Mongo
  Settings --> Mongo
  Contacts --> Mongo
  Templates --> Mongo
  Email --> Mongo
  Bots --> Mongo
  Calling --> Mongo
  Realtime --> Mongo
  Signals --> Mongo
  History --> Mongo
  Analytics --> Mongo`,

  persistence: String.raw`erDiagram
  USER ||--|| SYSTEM_SETTINGS : configures
  CONTACT_DIRECTORY ||--o{ CONTACT : groups
  CONTACT ||--o{ EMAIL_CAMPAIGN_CONTACT : receives
  TEMPLATE ||--o{ EMAIL_CAMPAIGN : powers
  EMAIL_CAMPAIGN ||--o{ EMAIL_CAMPAIGN_CONTACT : has
  AI_CALLING_BOT ||--o{ AI_CALLING_BOT_EMBEDDING : trains
  AI_CALLING_BOT ||--o{ CALLING_CAMPAIGN : configures
  CALLING_CAMPAIGN ||--o{ CALL_HISTORY : dials
  CONTACT ||--o{ CALL_HISTORY : receives
  COMPANY_WATCH ||--o{ SIGNAL : detects
  SIGNAL ||--o{ SIGNAL_MATCH : matches
  CONTACT ||--o{ SIGNAL_MATCH : matched_to
  PLAYBOOK ||--o{ SIGNAL_MATCH : queues
  PLAYBOOK ||--o{ TRIGGERED_OUTREACH : launches
  SIGNAL ||--o{ TRIGGERED_OUTREACH : attributes
  CONTACT ||--o{ TRIGGERED_OUTREACH : targeted`,

  providers: String.raw`flowchart LR
  Settings["Settings module stores encrypted credentials"]
  SES["AWS SES"]
  Twilio["Twilio"]
  GeminiText["Gemini text"]
  GeminiLive["Gemini Live"]
  Sources["RSS, EDGAR, job boards"]
  Email["Email campaigns"]
  Templates["Templates"]
  Calling["Calling campaigns"]
  Realtime["Realtime calling"]
  Bots["Calling agents + RAG"]
  Signals["Signals"]
  Settings --> Email
  Settings --> Templates
  Settings --> Calling
  Settings --> Realtime
  Settings --> Bots
  Settings --> Signals
  Email --> SES
  Templates --> GeminiText
  Calling --> Twilio
  Realtime --> GeminiLive
  Realtime --> Twilio
  Bots --> GeminiText
  Signals --> GeminiText
  Signals --> Sources`,

  crossFeature: String.raw`flowchart LR
  Auth["Auth + profile"] --> Settings["Settings + credentials"]
  Settings --> EmailInfra["SES email"]
  Settings --> VoiceInfra["Twilio + Gemini Live"]
  Settings --> AiText["Gemini text generation"]
  Contacts["Contacts + directories"] --> Email["Email campaigns"]
  Contacts --> Calling["VoiceReach campaigns"]
  Contacts --> Watches["Company watches"]
  Templates["Templates"] --> Email
  Bots["Calling agents"] --> Calling
  Watches --> Signals["Signals"]
  Signals --> Matches["Signal matches"]
  Matches --> Playbooks["Playbooks"]
  Playbooks --> Trigger["Triggered outreach"]
  Trigger --> Email
  Email --> History["History"]
  Calling --> History
  Email --> Analytics["Dashboard analytics"]
  Calling --> Analytics
  Trigger --> Analytics`,

  quickStart: String.raw`flowchart LR
  Account["Create account"]
  Settings["Connect SES, Gemini, or Twilio"]
  Contacts["Import contacts"]
  Build["Create template or bot"]
  Launch["Launch or schedule campaign"]
  Review["Review dashboard and history"]
  Automate["Add signals playbooks"]
  Account --> Settings --> Contacts --> Build --> Launch --> Review --> Automate`,

  dashboard: String.raw`flowchart TB
  Dashboard["/dashboard"]
  Api["api.analytics.get"]
  Analytics["AnalyticsController + AnalyticsService"]
  EmailRows["EmailCampaignContact"]
  Calls["CallHistory"]
  Contacts["Contact"]
  Templates["Template"]
  Triggered["TriggeredOutreach"]
  Charts["Recharts cards, charts, tables"]
  Dashboard --> Api --> Analytics
  Analytics --> EmailRows
  Analytics --> Calls
  Analytics --> Contacts
  Analytics --> Templates
  Analytics --> Triggered
  Dashboard --> Charts`,

  contacts: String.raw`flowchart TB
  Page["/contacts"]
  Api["api.contacts"]
  Controller["ContactsController"]
  Service["ContactsService"]
  Parser["CSV/XLSX parser"]
  Mapper["Column mapping + duplicate strategy"]
  Contact["Contact collection"]
  Directory["ContactDirectory collection"]
  Watch["WatchService"]
  CompanyWatch["CompanyWatch collection"]
  Downstream["Email, calling, signals, analytics"]
  Page --> Api --> Controller --> Service
  Service --> Parser --> Mapper
  Service --> Contact
  Service --> Directory
  Service --> Watch --> CompanyWatch
  Contact --> Downstream
  Directory --> Downstream`,

  email: String.raw`flowchart TB
  Page["/email-campaigns"]
  ApiTemplates["api.templates"]
  ApiCampaigns["api.emailCampaigns"]
  Templates["TemplatesService"]
  Campaigns["EmailCampaignsService"]
  AI["Gemini text generation"]
  Template["Template"]
  Campaign["EmailCampaign"]
  Recipients["EmailCampaignContact"]
  Contacts["Contact"]
  SES["AWS SES send"]
  History["History + analytics"]
  Page --> ApiTemplates --> Templates
  Templates --> AI
  Templates --> Template
  Page --> ApiCampaigns --> Campaigns
  Campaigns --> Campaign
  Campaigns --> Template
  Campaigns --> Contacts
  Campaigns --> Recipients
  Campaigns --> SES
  Recipients --> History`,

  scheduler: String.raw`flowchart TB
  EmailPage["/email-campaigns schedule"]
  CallingPage["/calling-campaigns schedule"]
  SchedulerPage["/scheduler"]
  EmailCampaign["EmailCampaign status=SCHEDULED"]
  CallingCampaign["CallingCampaign status=SCHEDULED"]
  Cron["CampaignSchedulerService every minute"]
  EmailLaunch["EmailCampaignsService.launchCampaign"]
  CallingLaunch["CallingCampaignsService.launchCampaign"]
  EmailPage --> EmailCampaign
  CallingPage --> CallingCampaign
  EmailCampaign --> SchedulerPage
  CallingCampaign --> SchedulerPage
  EmailCampaign --> Cron
  CallingCampaign --> Cron
  Cron --> EmailLaunch
  Cron --> CallingLaunch`,

  history: String.raw`flowchart TB
  HistoryPage["/history"]
  EmailApi["api.history.emails"]
  CallApi["api.history.calls"]
  RecordingApi["api.callingCampaigns.recordingAudio"]
  HistoryService["HistoryService"]
  RecordingProxy["CallingCampaignsService recording proxy"]
  EmailRows["EmailCampaignContact + campaign/contact/template"]
  Calls["CallHistory + campaign/contact"]
  Twilio["Twilio recording URL"]
  HistoryPage --> EmailApi --> HistoryService --> EmailRows
  HistoryPage --> CallApi --> HistoryService --> Calls
  HistoryPage --> RecordingApi --> RecordingProxy --> Twilio`,

  aiCalling: String.raw`sequenceDiagram
  actor Operator
  participant Page as /calling-campaigns
  participant Service as CallingCampaignsService
  participant DB as MongoDB
  participant Twilio
  participant WS as /twilio/stream gateway
  participant Gemini as Gemini Live
  Operator->>Page: Launch campaign
  Page->>Service: POST /calling-campaigns/:id/launch
  Service->>DB: Create or reset CallHistory rows
  Service->>Twilio: Create outbound calls
  Twilio->>Service: answer webhook
  Service-->>Twilio: TwiML Connect Stream with callId
  Twilio->>WS: Media WebSocket
  WS->>DB: Load call, campaign, contact, bot
  WS->>Gemini: Start Live session
  Twilio-->>WS: Caller audio
  WS-->>Gemini: Transcoded audio
  Gemini-->>WS: Agent audio + transcripts
  WS-->>Twilio: Audio frames
  WS->>DB: Persist transcript, outcome, errors`,

  aiBots: String.raw`flowchart TB
  BotsPage["/ai-calling-bots"]
  Api["api.aiCallingBots"]
  BotService["BotService"]
  Pdf["PDF/text extraction"]
  Chunks["Knowledge chunks"]
  Embed["local-hash-embedding-v1"]
  Bot["AiCallingBot"]
  Embedding["AiCallingBotEmbedding"]
  Search["Semantic search"]
  Calling["Calling campaign defaults + fetch_context"]
  BotsPage --> Api --> BotService
  BotService --> Bot
  BotService --> Pdf --> Chunks --> Embed --> Embedding
  BotService --> Search --> Embedding
  BotService --> Calling`,


  signals: String.raw`flowchart TB
  Contacts["Contacts import/create"]
  Watch["CompanyWatch"]
  Scheduler["Signal scheduler every 6 hours"]
  Collectors["News RSS, EDGAR, job-board, SES bounce"]
  Ingestion["IngestionService"]
  Classifier["SignalClassifierService"]
  Signal["Signal"]
  Matching["MatchingService"]
  Match["SignalMatch"]
  Playbooks["PlaybooksService"]
  Trigger["TriggerService"]
  Email["Email campaign pipeline"]
  Review["/signals review queue"]
  Contacts --> Watch
  Watch --> Scheduler --> Collectors --> Ingestion
  Ingestion --> Classifier
  Ingestion --> Signal
  Signal --> Matching --> Match
  Match --> Playbooks
  Playbooks -->|"review mode"| Review
  Playbooks -->|"auto high confidence"| Trigger --> Email`,

  settings: String.raw`flowchart TB
  Page["/settings"]
  Api["api.settings"]
  Controller["SettingsController"]
  Service["SettingsService"]
  Encrypt["credential-encryption helpers"]
  Settings["SystemSettings singleton"]
  Tests["test-ses, test-twilio, test-gemini, preview voice"]
  Consumers["Templates, email, bots, calling, realtime, signals"]
  Providers["SES, Twilio, Gemini"]
  Page --> Api --> Controller --> Service
  Service --> Encrypt --> Settings
  Service --> Tests --> Providers
  Settings --> Consumers
  Consumers --> Providers`,

  profile: String.raw`sequenceDiagram
  actor User
  participant Login as /login or /profile
  participant Api as api.auth
  participant Local as localAuth
  participant Guard as Frontend AuthGuard
  participant Backend as AuthController + AuthService
  participant Token as TokenService
  participant DB as User collection
  User->>Login: Login, register, reset, or update profile
  Login->>Api: Auth request
  Api->>Backend: /api/auth/*
  Backend->>DB: Read or update user
  Backend->>Token: Issue or verify tokens
  Backend-->>Api: Profile + token pair
  Api->>Local: Save tokens, profile, theme
  Guard->>Api: GET /auth/me for dashboard access
  Api->>Backend: Bearer access token
  Backend-->>Guard: Current user profile`,
} as const;

const FEATURE_ARCHITECTURE_PAGES: DocPage[] = [
  {
    slug: 'architecture-auth-profile',
    title: 'Auth & profile architecture',
    tagline: 'Session tokens, route guards, profile persistence, and theme application.',
    icon: 'user',
    category: 'Feature architecture',
    intro: [
      'Authentication spans the public /login page, the dashboard AuthGuard, the central api.auth client methods, and the backend AuthModule. Profile settings reuse the same user record for identity, password updates, theme, and accent color.',
    ],
    sections: [
      {
        heading: 'Runtime flow',
        body: [
          'Register, login, refresh, forgot-password (emails a one-time reset link), reset-password, profile update, and logout are exposed by /api/auth. The frontend stores access and refresh tokens in localAuth, applies theme values immediately, and verifies dashboard access with GET /auth/me.',
        ],
        diagram: { caption: 'Auth, token, profile, and theme flow', chart: DIAGRAMS.profile },
      },
      {
        heading: 'Implementation map',
        capabilities: [
          { title: 'Frontend', text: '/login, /profile, AuthGuard, Sidebar theme toggle, localAuth, and api.auth.' },
          { title: 'Backend', text: 'AuthController, AuthService, TokenService, password helpers, Public decorator, and global AuthGuard.' },
          { title: 'Data', text: 'User stores email, passwordHash, refreshTokenHash, name, initials, title, company, phone, theme, and accentColor.' },
          { title: 'Security', text: 'Access tokens are short-lived, refresh tokens are hashed on the user document, and logout invalidates the stored refresh token hash.' },
        ],
      },
    ],
    related: ['profile', 'settings', 'architecture'],
  },
  {
    slug: 'architecture-settings',
    title: 'Settings architecture',
    tagline: 'Encrypted credentials and provider readiness for email, AI, and calls.',
    icon: 'settings',
    category: 'Feature architecture',
    intro: [
      'Settings is the provider boundary. The UI saves AWS SES, Twilio, and Gemini values; the backend encrypts secrets into SystemSettings and exposes masked reads plus connection tests.',
    ],
    sections: [
      {
        heading: 'Runtime flow',
        body: [
          'Feature services do not read provider secrets from the frontend. They resolve decrypted settings server-side when sending email, previewing Gemini voice, generating text, launching calls, classifying signals, or serving bot workflows.',
        ],
        diagram: { caption: 'Encrypted provider configuration', chart: DIAGRAMS.settings },
      },
      {
        heading: 'Implementation map',
        capabilities: [
          { title: 'Frontend', text: '/settings, MissingCredentials helper, api.settings.get/update/testSes/testTwilio/testGemini/previewGeminiVoice.' },
          { title: 'Backend', text: 'SettingsController, SettingsService, credential-encryption helpers, and gemini-text model resolver.' },
          { title: 'Data', text: 'SystemSettings singleton stores encrypted AWS, Twilio, and Gemini values plus verification status timestamps.' },
          { title: 'Providers', text: 'AWS SES sends email, Twilio places calls, Gemini handles text generation, signal classification, voice preview, and Live calls.' },
        ],
      },
    ],
    related: ['settings', 'email-campaigns', 'ai-calling', 'signals'],
  },
  {
    slug: 'architecture-contacts',
    title: 'Contacts architecture',
    tagline: 'Audience records, directories, imports, and signal watch creation.',
    icon: 'users',
    category: 'Feature architecture',
    intro: [
      'Contacts are the shared audience model for email, calling, signals, history, and analytics. Directories provide lightweight segmentation for campaigns and playbooks.',
    ],
    sections: [
      {
        heading: 'Runtime flow',
        body: [
          'The /contacts page uses api.contacts to load contacts/directories, parse import files, map columns, save rows, and refresh query caches. Imports can create company watches from business email domains.',
        ],
        diagram: { caption: 'Contact import and downstream usage', chart: DIAGRAMS.contacts },
      },
      {
        heading: 'Implementation map',
        capabilities: [
          { title: 'Frontend', text: '/contacts, contact/directory modals, import mapper, TanStack Query, and selectedContactIds in Zustand.' },
          { title: 'Backend', text: 'ContactsController and ContactsService own CRUD, CSV/XLSX parsing, duplicate behavior, custom fields, and directory lifecycle.' },
          { title: 'Data', text: 'Contact, ContactDirectory, and best-effort CompanyWatch records.' },
          { title: 'Consumers', text: 'Email campaigns, calling campaigns, signal matching, history filters, and dashboard segment analytics.' },
        ],
      },
    ],
    related: ['contacts', 'architecture-email-campaigns', 'architecture-signals'],
  },
  {
    slug: 'architecture-email-campaigns',
    title: 'MailReach architecture',
    tagline: 'Templates, recipients, personalization, launch, scheduling, and SES delivery.',
    icon: 'mail',
    category: 'Feature architecture',
    intro: [
      'Email outreach is split between TemplatesService for reusable copy and EmailCampaignsService for campaign shells, recipient rows, interpolation, sending, scheduling, and relaunch.',
    ],
    sections: [
      {
        heading: 'Runtime flow',
        body: [
          'A campaign references a template, recipient rows reference contacts, and launch personalizes subject/body per contact before sending with AWS SES. Recipient rows become the source of truth for history and analytics.',
        ],
        diagram: { caption: 'Template and email campaign lifecycle', chart: DIAGRAMS.email },
      },
      {
        heading: 'Implementation map',
        capabilities: [
          { title: 'Frontend', text: '/email-campaigns, api.templates, api.emailCampaigns, generation polling, recipient picker, schedule UI.' },
          { title: 'Backend', text: 'TemplatesController/Service and EmailCampaignsController/Service.' },
          { title: 'Data', text: 'Template, EmailCampaign, EmailCampaignContact, Contact, and SystemSettings.' },
          { title: 'Outcomes', text: 'EmailCampaignContact stores personalized copy, sentTime, deliveryStatus, openStatus, replyStatus, and errorMessage.' },
        ],
      },
    ],
    related: ['email-campaigns', 'architecture-contacts', 'architecture-scheduler', 'architecture-dashboard-history'],
  },
  {
    slug: 'architecture-ai-calling',
    title: 'VoiceReach architecture',
    tagline: 'Twilio outbound calls, media streams, Gemini Live, transcripts, and recordings.',
    icon: 'phone',
    category: 'Feature architecture',
    intro: [
      'VoiceReach combines REST campaign management with public Twilio webhooks and a raw media WebSocket. The backend owns every provider callback and persists call state in CallHistory.',
    ],
    sections: [
      {
        heading: 'Runtime flow',
        body: [
          'Launching a campaign creates or resets call rows, Twilio dials contacts, answer webhooks return TwiML, and Twilio streams audio to /twilio/stream. RealtimeCallingGateway bridges audio to Gemini Live and writes transcripts/outcomes back to MongoDB.',
        ],
        diagram: { caption: 'Twilio media stream to Gemini Live', chart: DIAGRAMS.aiCalling },
      },
      {
        heading: 'Implementation map',
        capabilities: [
          { title: 'Frontend', text: '/calling-campaigns, /history, api.callingCampaigns, voice preview, campaign polling, recording download.' },
          { title: 'Backend', text: 'CallingCampaignsService, Twilio webhook handlers, RealtimeCallingGateway, GeminiLiveSessionWrapper, audio-codec, prompts, tools, and language profiles.' },
          { title: 'Data', text: 'CallingCampaign, CallHistory, Contact, AiCallingBot, and SystemSettings.' },
          { title: 'Providers', text: 'Twilio places calls and serves recordings; Gemini Live handles realtime native-audio conversations.' },
        ],
      },
    ],
    related: ['ai-calling', 'architecture-ai-bots', 'architecture-dashboard-history'],
  },
  {
    slug: 'architecture-ai-bots',
    title: 'Calling agents & RAG architecture',
    tagline: 'Reusable voice personas, knowledge ingestion, local embeddings, and search.',
    icon: 'bot',
    category: 'Feature architecture',
    intro: [
      'Calling Agents provide reusable persona and knowledge settings for live calls. Knowledge ingestion is local-friendly: text/PDF content is chunked and embedded with local-hash-embedding-v1.',
    ],
    sections: [
      {
        heading: 'Runtime flow',
        body: [
          'BotService normalizes persona fields, extracts knowledge, stores embeddings, performs semantic search, and provides default voice/persona context to calling campaigns.',
        ],
        diagram: { caption: 'Bot persona and RAG knowledge flow', chart: DIAGRAMS.aiBots },
      },
    ],
    related: ['ai-bots', 'architecture-ai-calling'],
  },
  {
    slug: 'architecture-signals',
    title: 'Signals & playbooks architecture',
    tagline: 'Company watches, collectors, classification, matching, review, and triggered outreach.',
    icon: 'radar',
    category: 'Feature architecture',
    intro: [
      'Signals turns contacts into monitored account intelligence. Company watches feed collectors, collectors emit raw events, ingestion classifies and deduplicates, matching links events to contacts, and playbooks decide review or auto-trigger behavior.',
    ],
    sections: [
      {
        heading: 'Runtime flow',
        body: [
          'The scheduler polls active watches every six hours, while /signals/poll can run immediately. Triggered email outreach reuses EmailCampaignsService so attribution, history, and analytics remain connected.',
        ],
        diagram: { caption: 'Signal ingestion, matching, and playbook automation', chart: DIAGRAMS.signals },
      },
      {
        heading: 'Implementation map',
        capabilities: [
          { title: 'Frontend', text: '/signals feed/review/watches, /signals/playbooks wizard, and api.signals methods.' },
          { title: 'Backend', text: 'SignalsService, SchedulerService, collectors, IngestionService, SignalClassifierService, MatchingService, PlaybooksService, TriggerService, WatchService.' },
          { title: 'Data', text: 'CompanyWatch, Signal, SignalMatch, Playbook, TriggeredOutreach, Contact, Template, and EmailCampaign.' },
          { title: 'Guardrails', text: 'Duplicate suppression, cooldown windows, daily caps, review mode, and active/paused toggles.' },
        ],
      },
    ],
    related: ['signals', 'architecture-contacts', 'architecture-email-campaigns'],
  },
  {
    slug: 'architecture-scheduler',
    title: 'Scheduler architecture',
    tagline: 'Mongo-backed scheduled email and calling campaign launches.',
    icon: 'calendar-clock',
    category: 'Feature architecture',
    intro: [
      'Campaign scheduling is stored on campaign documents, not in a separate queue. A backend cron checks due campaigns every minute and launches them through the same services used by manual launch.',
    ],
    sections: [
      {
        heading: 'Runtime flow',
        body: [
          'The Scheduler page composes existing email and calling campaign APIs. Cancelling a schedule calls the campaign-specific unschedule endpoint and returns the item to draft/immediate mode.',
        ],
        diagram: { caption: 'Campaign scheduler lifecycle', chart: DIAGRAMS.scheduler },
      },
      {
        heading: 'Implementation map',
        capabilities: [
          { title: 'Frontend', text: '/scheduler plus schedule controls inside /email-campaigns and /calling-campaigns.' },
          { title: 'Backend', text: 'CampaignSchedulerService, EmailCampaignsService.findDueScheduled/launchCampaign, CallingCampaignsService.findDueScheduled/launchCampaign.' },
          { title: 'Data', text: 'EmailCampaign uses status and scheduledAt; CallingCampaign uses status, scheduleType, scheduledAt, and timezone.' },
          { title: 'Failure behavior', text: 'Failed launches are logged and unscheduled where possible so the cron does not retry forever every minute.' },
        ],
      },
    ],
    related: ['scheduler', 'architecture-email-campaigns', 'architecture-ai-calling'],
  },
  {
    slug: 'architecture-dashboard-history',
    title: 'Dashboard & history architecture',
    tagline: 'Derived analytics and raw email/call audit trails.',
    icon: 'history',
    category: 'Feature architecture',
    intro: [
      'Dashboard and History are read surfaces over campaign outcome records. Dashboard aggregates performance; History exposes filtered raw records and recording playback.',
    ],
    sections: [
      {
        heading: 'Dashboard data flow',
        body: [
          'AnalyticsService reads email recipient rows, call history, contacts, templates, and triggered outreach attribution to produce live dashboard metrics and charts.',
        ],
        diagram: { caption: 'Dashboard analytics data flow', chart: DIAGRAMS.dashboard },
      },
      {
        heading: 'History data flow',
        body: [
          'HistoryService returns filtered EmailCampaignContact and CallHistory records with related campaign/contact data. Recording audio is proxied through the backend to keep Twilio credentials server-side.',
        ],
        diagram: { caption: 'History and recording access', chart: DIAGRAMS.history },
      },
    ],
    related: ['dashboard', 'history', 'architecture-email-campaigns', 'architecture-ai-calling'],
  },
];

export const DOC_PAGES: DocPage[] = [
  // ─────────────────────────────── Architecture
  {
    slug: 'architecture',
    title: 'System architecture',
    tagline: 'How the frontend, backend, database, schedulers, and providers fit together.',
    icon: 'network',
    category: 'Architecture',
    intro: [
      'ReachConvert is split into a Next.js operator workspace and a NestJS backend. The frontend owns the product experience; the backend owns authentication, provider credentials, persistence, campaign orchestration, scheduled jobs, signal ingestion, and realtime voice calls.',
      'The regular product API is REST under /api. Live calling also uses a raw WebSocket upgrade path at /twilio/stream so Twilio can stream phone audio directly into the Gemini Live bridge.',
    ],
    sections: [
      {
        heading: 'Whole application topology',
        body: [
          'This is the full runtime shape: a browser-based operator workspace, a NestJS API and realtime bridge, MongoDB persistence, scheduled jobs, and provider integrations. Regular product traffic goes through REST under /api; Twilio media bypasses the API prefix and upgrades directly at /twilio/stream.',
        ],
        diagram: {
          caption: 'ReachConvert system topology',
          chart: DIAGRAMS.appTopology,
        },
      },
      {
        heading: 'Frontend to backend request flow',
        body: [
          'All product pages call the backend through src/lib/api.ts. The client attaches the access token, retries once through /auth/refresh on a 401, and then returns friendly errors to the page. Server state is cached with TanStack Query; local session and theme data live in localAuth.',
        ],
        diagram: {
          caption: 'Authenticated REST request lifecycle',
          chart: DIAGRAMS.appRestFlow,
        },
      },
      {
        heading: 'Backend module map',
        body: [
          'AppModule registers the feature modules, MongoModule, realtime calling, and schedulers. Feature services use MongoService delegates for persistence, and only the Twilio media stream is handled outside the normal /api REST path.',
        ],
        diagram: {
          caption: 'NestJS feature boundaries',
          chart: DIAGRAMS.backendModules,
        },
      },
      {
        heading: 'Persistence model',
        body: [
          'MongoDB is the source of truth for identity, credentials, contacts, campaigns, calls, bots, signals, playbooks, and outcome attribution. MongoService converts Mongo _id fields into API id fields and hydrates selected relationships for campaign, recipient, and call views.',
        ],
        diagram: {
          caption: 'Core collections and relationships',
          chart: DIAGRAMS.persistence,
        },
      },
      {
        heading: 'Provider boundaries',
        body: [
          'Provider credentials are entered in Settings, encrypted in SystemSettings, and consumed by feature services. Email uses AWS SES, calling uses Twilio plus Gemini Live, text generation and classification use Gemini text models, and signal polling reads public sources.',
        ],
        diagram: {
          caption: 'External service integration map',
          chart: DIAGRAMS.providers,
        },
      },
      {
        heading: 'Cross-feature dependencies',
        body: [
          'Most features connect through contacts, provider settings, and outcome records. Contacts feed campaigns and watches; templates and bots configure outreach; playbooks convert signals into campaigns; history and analytics read the resulting email and call records.',
        ],
        diagram: {
          caption: 'Product dependency graph',
          chart: DIAGRAMS.crossFeature,
        },
      },
      {
        heading: 'High-level flow',
        code: {
          lines: [
            'Browser operator UI',
            '  -> Next.js App Router, TanStack Query, Zustand',
            '  -> REST /api with Bearer access token',
            '  -> NestJS feature modules',
            '  -> MongoDB through Mongoose-backed MongoService delegates',
            '',
            'Provider side channels:',
            '  Twilio webhooks -> /api/calling-campaigns/twilio/*',
            '  Twilio media    -> /twilio/stream',
            '  Backend         -> AWS SES, Gemini text/Live, Twilio, public signal sources',
          ],
        },
      },
      {
        heading: 'Backend modules',
        capabilities: [
          { title: 'Auth & settings', text: 'JWT-like sessions, global route guarding, encrypted provider credentials, and provider test endpoints.' },
          { title: 'Contacts & templates', text: 'Audience records, directories, custom fields, email copy, attachments, reference PDFs, and AI generation.' },
          { title: 'Campaigns', text: 'Email sends through SES, VoiceReach through Twilio and Gemini Live, scheduling, relaunch, stop, and history records.' },
          { title: 'Signals', text: 'Company watches, collectors, classification, deduplication, contact matching, playbooks, review queue, and triggered outreach attribution.' },
        ],
      },
      {
        heading: 'Data model',
        body: [
          'MongoDB stores users, encrypted settings, contacts, directories, templates, email campaigns, recipient rows, calling agents, bot embeddings, calling campaigns, call history, company watches, signals, signal matches, playbooks, and triggered outreach records.',
          'The backend accesses those collections through a global MongoService. Its delegates expose Prisma-like methods such as findMany, findUnique, create, update, delete, and selected include hydration while keeping MongoDB as the storage engine.',
        ],
      },
      {
        heading: 'Scheduled and realtime work',
        capabilities: [
          { title: 'Campaign scheduler', text: 'Runs every minute and launches email/calling campaigns whose scheduledAt time is due.' },
          { title: 'Signal scheduler', text: 'Runs every six hours and polls active company watches through source-specific collectors.' },
          { title: 'Realtime calling', text: 'Upgrades /twilio/stream sockets, transcodes Twilio audio, opens Gemini Live sessions, handles tools, and persists call outcomes.' },
        ],
      },
    ],
    tips: [
      'For contributor-facing implementation notes, read docs/ARCHITECTURE.md at the workspace root.',
      'Swagger at /docs on the backend is the most accurate live API contract for the running server.',
    ],
    related: ['architecture-auth-profile', 'architecture-settings', 'architecture-contacts', 'architecture-email-campaigns', 'architecture-ai-calling', 'architecture-signals'],
  },
  ...FEATURE_ARCHITECTURE_PAGES,

  // ─────────────────────────────── Getting started
  {
    slug: 'quick-start',
    title: 'Quick start',
    tagline: 'Go from sign-up to your first tracked campaign in five steps.',
    icon: 'rocket',
    category: 'Getting started',
    intro: [
      'ReachConvert unifies personalized bulk email, autonomous AI voice calling, and signal-based automation in one workspace. This guide gets a brand-new account to its first live, tracked campaign.',
    ],
    sections: [
      {
        heading: 'Workspace setup flow',
        body: [
          'A new workspace becomes useful in layers: authenticate, connect at least one provider, import contacts, build the outreach asset, launch or schedule, then measure and automate.',
        ],
        diagram: {
          caption: 'Recommended first-run path',
          chart: DIAGRAMS.quickStart,
        },
      },
      {
        heading: 'The five-minute path',
        steps: [
          'Create your account and sign in — you land on the Outreach Dashboard.',
          'Open Settings and connect at least one channel: AWS SES for email, or a Gemini Live key for VoiceReach.',
          'Go to Contacts and import a CSV/XLSX, mapping columns to name, email, company, and job title.',
          'Build a template under MailReach (write it yourself or generate it with AI), then create a campaign and add contacts.',
          'Hit Launch and watch deliveries, opens, and replies stream into the Dashboard in real time.',
        ],
      },
      {
        heading: 'What to set up next',
        capabilities: [
          {
            title: 'Turn on Signals',
            text: 'Importing contacts automatically starts watching their companies. Create a Playbook so funding, hiring, and news events trigger outreach on their own.',
          },
          {
            title: 'Configure VoiceReach',
            text: 'Add a Gemini Live key and design a Calling Agent persona to run automated voice campaigns through Twilio.',
          },
          {
            title: 'Personalize your workspace',
            text: 'Pick a theme and accent color under Profile — the whole app recolors instantly.',
          },
        ],
      },
    ],
    tips: [
      'MailReach campaigns need working AWS SES credentials and a verified sender address; a launch without them fails instead of pretending to send.',
      'Every list view supports live sync — leave the Dashboard open during a launch to watch metrics update every 10 seconds.',
    ],
    related: ['architecture', 'architecture-contacts', 'architecture-email-campaigns', 'architecture-signals', 'dashboard'],
  },
  {
    slug: 'how-features-connect',
    title: 'How features connect',
    tagline: 'An operator view of how work moves across contacts, campaigns, and analytics.',
    icon: 'network',
    category: 'Getting started',
    intro: [
      'ReachConvert works best when features are used together. Contacts feed campaigns, settings unlock channels, and history plus dashboard metrics tell you what is working.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: complete profile and connect channels in Settings (AWS SES for email, Twilio and Gemini for calling).',
          'Configure: import contacts, organize directories, and create templates or calling agents based on your outreach style.',
          'Launch: run email and calling campaigns manually or schedule them for future launch windows.',
          'Monitor: use History for record-level details and Dashboard for roll-up metrics across channels.',
          'Troubleshoot: if performance drops, check settings status, data quality in contacts, and message/script quality in templates or agents.',
        ],
      },
      {
        heading: 'What connects to what',
        capabilities: [
          { title: 'Contacts -> Campaigns', text: 'Email and calling campaigns pull audiences directly from contacts and directories.' },
          { title: 'Settings -> Delivery', text: 'Channel credentials in Settings control whether launches can actually send or call.' },
          { title: 'Signals -> Outreach', text: 'Signals and playbooks can trigger outreach automatically using your existing templates.' },
          { title: 'Outcomes -> Analytics', text: 'History stores row-level outcomes while Dashboard aggregates those outcomes into trends.' },
        ],
      },
    ],
    related: ['quick-start', 'contacts', 'email-campaigns', 'ai-calling', 'dashboard'],
  },

  // ─────────────────────────────── Core features
  {
    slug: 'dashboard',
    title: 'Dashboard',
    tagline: 'A real-time command center for every channel you run.',
    icon: 'layout-dashboard',
    category: 'Core features',
    intro: [
      'The Dashboard is the first screen you see. It aggregates email deliverability, VoiceReach outcomes, template performance, and your most responsive company segments into a single live view that refreshes automatically.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'Metrics at a glance',
        capabilities: [
          { title: 'Emails Sent', text: 'Total dispatched with a delivered-vs-failed breakdown.' },
          { title: 'Email Open Rate', text: 'Open percentage alongside your reply rate.' },
          { title: 'Calls Made', text: 'Volume of AI voice calls placed across campaigns.' },
          { title: 'Call Success Rate', text: 'Connected/qualified rate with average call duration.' },
        ],
      },
      {
        heading: 'Charts and tables',
        body: [
          'The Campaign Performance chart compares emails sent against opens and replies so you can see which sends actually landed.',
          'Top Company Segments ranks the organizations most responsive to your outreach, with open- and reply-rate bars per segment.',
          'The Template Performance table breaks down each template by campaign uses, open rate, and reply rate — your fastest read on what messaging converts.',
        ],
      },
      {
        heading: 'Live sync',
        body: [
          'A “Live Sync Active” badge indicates the Dashboard is polling for fresh data every 10 seconds. Launch a campaign in another tab and the numbers here move on their own — no refresh needed.',
        ],
      },
    ],
    tips: [
      'If the Dashboard shows an error, it almost always means the backend or database is unreachable — check that the NestJS server is running.',
    ],
    related: ['architecture-dashboard-history', 'email-campaigns', 'ai-calling', 'history'],
  },
  {
    slug: 'signals',
    title: 'Signals — campaigns that trigger themselves',
    tagline: 'Watch your accounts and reach out the moment a buying signal fires.',
    icon: 'radar',
    category: 'Core features',
    intro: [
      'Signals is ReachConvert’s flagship differentiator. Instead of you deciding when to send, the platform continuously watches your contacts’ companies for buying signals — funding rounds, hiring surges, product launches, news, and job changes — and triggers the right outreach within hours of the event.',
      'Timing is the strongest predictor of reply rates. A “congrats on the raise” email sent the same day dramatically outperforms the same message three weeks later.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'How it works',
        steps: [
          'Company watches are created automatically from the email domains of contacts you import (free-mail domains are skipped).',
          'Collectors poll public sources on a schedule — Google News, SEC EDGAR filings, and public hiring boards — plus your own send telemetry.',
          'Each detected item is classified into a signal type and de-duplicated, then matched to the contacts it applies to.',
          'Playbooks decide what happens: auto-send for high-confidence matches, or queue a draft in the Review Queue for your approval.',
          'Triggered outreach reuses the email pipeline, injecting signal details into your template, and is tracked separately so you can compare its lift against manual sends.',
        ],
      },
      {
        heading: 'Signal types detected',
        capabilities: [
          { title: 'Funding round', text: 'Fundraises inferred from news and SEC Form D filings.' },
          { title: 'Hiring surge', text: 'A jump in open roles on a company’s public job board.' },
          { title: 'Company news', text: 'Acquisitions, expansions, and other notable coverage.' },
          { title: 'Product launch', text: 'New product or feature announcements.' },
          { title: 'Job change', text: 'A contact leaving their company, inferred from bounce telemetry.' },
        ],
      },
      {
        heading: 'Playbooks',
        body: [
          'A playbook is a rule: “when signal X fires for audience Y, send template Z.” Build one with the three-step wizard — pick trigger signal types, choose an audience (a contact directory or everyone), then select a template and mode.',
          'Review mode queues drafts for approval; Auto mode sends instantly, but only for high-confidence matches.',
        ],
      },
      {
        heading: 'Guardrails',
        body: [
          'Because automated sending can damage deliverability, every playbook enforces guardrails: a per-contact cooldown (default 30 days), a per-playbook daily send cap (default 50), duplicate suppression so the same signal never fires twice for the same contact, and pausing to stop a playbook instantly.',
        ],
      },
      {
        heading: 'Signal template variables',
        body: [
          'Reference the event directly in any template so the message feels hand-written:',
        ],
        code: {
          caption: 'Available in subject and body',
          lines: [
            '{{signal.type}}     → e.g. "Funding round"',
            '{{signal.summary}}  → one-line description of the event',
            '{{signal.date}}     → when it happened',
            '{{signal.company}}  → the company name',
            '{{signal.url}}      → source link',
            '{{signal.detail.roundSize}} → extracted entity (when available)',
          ],
        },
      },
    ],
    tips: [
      'No external keys required to explore: without a Gemini key, a built-in keyword classifier handles signal typing so the whole flow works in dev.',
      'Use the “Add signal” button to inject a manual signal (e.g. “saw them speak at a conference”) and match it to a specific contact by email.',
      'Hit “Scan now” to run a collection poll immediately instead of waiting for the scheduled cycle.',
    ],
    related: ['architecture-signals', 'contacts', 'email-campaigns', 'dashboard'],
  },
  {
    slug: 'contacts',
    title: 'Contacts',
    tagline: 'Import, organize, and segment the people you reach.',
    icon: 'users',
    category: 'Core features',
    intro: [
      'Contacts is your source of truth for everyone you reach out to. Import in bulk, organize into directories, and enrich each record with the custom fields your templates personalize against.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'Importing contacts',
        steps: [
          'Click Import and upload a CSV or XLSX file.',
          'Map your spreadsheet columns to ReachConvert fields — first name, last name, email, company, job title, phone, and any custom fields.',
          'Choose a duplicate strategy: Skip existing rows or Overwrite them.',
          'Optionally assign the whole import to a directory, then confirm.',
        ],
      },
      {
        heading: 'Directories (segments)',
        body: [
          'Directories group contacts — by company type, seniority, region, or any axis you choose. They power targeted campaigns and let Signals playbooks scope to a specific audience.',
          'The Dashboard’s Top Company Segments view is built from this organization, surfacing which groups respond best.',
        ],
      },
      {
        heading: 'Custom fields & personalization',
        body: [
          'Any column beyond the standard fields is stored as a custom field and becomes available as a template variable — for example a {{industry}} column becomes usable as a merge tag in your emails and calling scripts.',
        ],
      },
    ],
    tips: [
      'Importing contacts automatically starts Signal watches for their company domains — no extra step to begin monitoring accounts.',
      'Keep company names consistent across rows so segment analytics and signal matching group them correctly.',
    ],
    related: ['architecture-contacts', 'email-campaigns', 'signals', 'ai-calling'],
  },
  {
    slug: 'email-campaigns',
    title: 'MailReach campaigns',
    tagline: 'Personalized bulk outreach with tracking and AI-written copy.',
    icon: 'mail',
    category: 'Core features',
    intro: [
      'MailReach sends personalized bulk email through AWS SES with per-recipient merge fields, delivery tracking, and optional attachments. Templates can be written by hand or generated by AI from a short brief.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'Building templates',
        capabilities: [
          {
            title: 'AI generation',
            text: 'Describe your goal, audience, and tone, and the AI drafts a subject and body with merge variables in place. Generation runs as a background job you can watch.',
          },
          {
            title: 'Manual authoring',
            text: 'Write HTML or plain-text templates directly, using {{firstName}}, {{company}}, and any custom field as variables.',
          },
          {
            title: 'Attachments',
            text: 'Attach files to a template; they ride along with every personalized send.',
          },
        ],
      },
      {
        heading: 'Launching a campaign',
        steps: [
          'Create a campaign and select a template.',
          'Add contacts individually or by directory.',
          'Click Launch — each recipient gets an individually interpolated copy.',
          'Watch delivery status per recipient (Pending → Sent/Failed) and monitor opens and replies.',
        ],
      },
      {
        heading: 'Relaunching',
        body: [
          'Launching a completed campaign again re-queues every recipient with a fresh delivery attempt — useful for follow-up waves. The button reads “Launch Again” once a campaign has run.',
        ],
      },
    ],
    tips: [
      'Every send goes through AWS SES. To rehearse safely, launch to a small directory of your own addresses first.',
      'Signal-triggered campaigns reuse this exact pipeline, so anything you learn here applies to automated outreach too.',
    ],
    related: ['architecture-email-campaigns', 'contacts', 'signals', 'scheduler', 'dashboard', 'settings'],
  },
  {
    slug: 'scheduler',
    title: 'Scheduler',
    tagline: 'One place to see and cancel future MailReach and VoiceReach launches.',
    icon: 'calendar-clock',
    category: 'Core features',
    intro: [
      'Scheduler shows every campaign queued for a future launch time. It combines scheduled MailReach campaigns and scheduled VoiceReach campaigns into one chronological view.',
      'The backend checks due campaigns once per minute. When a scheduled time arrives, the normal launch pipeline runs, so delivery, call history, alerts, and dashboard metrics behave the same as a manual launch.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'What appears here',
        capabilities: [
          { title: 'MailReach campaigns', text: 'Campaigns with status SCHEDULED and a scheduledAt timestamp.' },
          { title: 'VoiceReach campaigns', text: 'Campaigns with status SCHEDULED and a scheduledAt timestamp.' },
        ],
      },
      {
        heading: 'Scheduling flow',
        steps: [
          'Open MailReach or VoiceReach and configure the campaign.',
          'Choose Schedule instead of launching immediately.',
          'Pick a future date and time.',
          'Open Scheduler to verify the campaign is queued.',
          'Cancel from Scheduler if the campaign should return to draft/immediate mode.',
        ],
      },
      {
        heading: 'Backend behavior',
        body: [
          'The Campaign Scheduler runs every minute in the NestJS backend. It queries MongoDB for due scheduled email and calling campaigns, then launches each campaign through the same service method used by manual launch.',
          'If the backend is offline at the scheduled time, the campaign launches after the backend comes back and the cron sees the campaign as due.',
        ],
      },
    ],
    tips: [
      'Scheduling stores launch intent on the campaign document; there is no separate queue service.',
      'Make sure provider credentials and contacts are ready before the scheduled time.',
    ],
    related: ['architecture-scheduler', 'email-campaigns', 'ai-calling', 'history', 'dashboard'],
  },
  {
    slug: 'history',
    title: 'History',
    tagline: 'A complete audit trail of every email and call.',
    icon: 'history',
    category: 'Core features',
    intro: [
      'History is the searchable record of everything ReachConvert has sent or dialed. Email history and call history live side by side so you can trace any interaction end to end.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'Email history',
        body: [
          'Every dispatched message is logged with its recipient, subject, delivery status, timestamp, and open/reply flags — the raw data behind your Dashboard metrics.',
        ],
      },
      {
        heading: 'Call history',
        body: [
          'Each AI call records its outcome, duration, and — where available — a transcript and recording, so you can audit exactly what the agent said and how the prospect responded.',
        ],
      },
    ],
    tips: ['Use History to debug deliverability: a cluster of failures usually points to a credential or domain issue in Settings.'],
    related: ['architecture-dashboard-history', 'email-campaigns', 'ai-calling', 'dashboard'],
  },

  // ─────────────────────────────── AI outreach
  {
    slug: 'ai-calling',
    title: 'VoiceReach campaigns',
    tagline: 'Autonomous voice agents that dial, qualify, and log calls.',
    icon: 'phone',
    category: 'AI outreach',
    intro: [
      'VoiceReach runs automated outbound voice campaigns. A Gemini Live agent places calls through Twilio, holds a natural conversation using the persona and script you define, and logs the transcript and outcome for every call.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'Setting up a campaign',
        steps: [
          'Add and verify a Gemini API key for Gemini Live in Settings, plus your Twilio credentials.',
          'Create a calling campaign: give it an objective, a prompt/script, and choose a voice and language.',
          'Attach a Calling Agent persona (or configure the agent inline) and add contacts.',
          'Start the dialer — Twilio queues the calls and the agent begins conversations.',
        ],
      },
      {
        heading: 'Conversation controls',
        capabilities: [
          { title: 'Voice & language', text: 'Choose from Gemini Live HD voices and set the spoken language.' },
          { title: 'Who speaks first', text: 'Decide whether the AI opens the call or waits for the prospect.' },
          { title: 'Interruption handling', text: 'Tune how the agent handles being interrupted for a natural cadence.' },
        ],
      },
      {
        heading: 'Relaunching & monitoring',
        body: [
          'Relaunch re-queues pending or unconnected calls. Twilio queue status appears in the call logs, and each completed call surfaces its duration, transcript, and recording in History.',
        ],
      },
    ],
    tips: [
      'Latency matters for natural conversation — keep prompts focused and avoid overly long system instructions.',
      'If no calls queue, verify your Twilio credentials and that your public callback URL is reachable.',
    ],
    related: ['architecture-ai-calling', 'ai-bots', 'contacts', 'settings', 'history'],
  },
  {
    slug: 'ai-bots',
    title: 'Calling agents',
    tagline: 'Reusable voice personas with scripts and knowledge.',
    icon: 'bot',
    category: 'AI outreach',
    intro: [
      'Calling Agents are the reusable personas that power your calling campaigns. Design an agent once — its voice, personality, objectives, and knowledge — then deploy it across many campaigns for consistent conversations.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'What defines an agent',
        capabilities: [
          { title: 'Persona & objective', text: 'The agent’s role, tone, and the goal it drives every call toward.' },
          { title: 'Script & prompts', text: 'The opening, talking points, and objection handling it follows.' },
          { title: 'Knowledge', text: 'Reference material the agent can draw on, searchable so it answers accurately.' },
        ],
      },
      {
        heading: 'Creating and reusing agents',
        steps: [
          'Open Calling Agents and create a new agent with its persona and script.',
          'Add any knowledge or reference documents you want it to use.',
          'Save it, then select it when configuring a VoiceReach campaign.',
          'Iterate: refine the script and every future campaign using that agent inherits the improvement.',
        ],
      },
    ],
    tips: ['Use the knowledge search on the Calling Agents page to check an agent finds the right answers before putting it on live calls.'],
    related: ['architecture-ai-bots', 'ai-calling', 'settings'],
  },

  // ─────────────────────────────── Configuration
  {
    slug: 'settings',
    title: 'Settings & credentials',
    tagline: 'Connect the services that power sending and calling.',
    icon: 'settings',
    category: 'Configuration',
    intro: [
      'Settings is where you connect the external services ReachConvert orchestrates. Credentials are stored encrypted, and each integration has a test button so you can verify a connection before you rely on it.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'Integrations',
        capabilities: [
          { title: 'AWS SES', text: 'Powers email delivery. Add your access key, secret, region, and sender address, then Test SES.' },
          { title: 'Gemini (Live)', text: 'Powers VoiceReach and signal classification. Add and verify your Gemini API key.' },
          { title: 'Twilio', text: 'Places the actual phone calls. Add your account SID, auth token, and phone number.' },
          { title: 'Gemini (Text)', text: 'The same Gemini key backs AI text generation for templates. Pick a cheap text model such as gemini-2.5-flash-lite.' },
        ],
      },
      {
        heading: 'Verifying connections',
        steps: [
          'Enter credentials for a service.',
          'Click its Test button — a live check confirms the keys work.',
          'A connected status unlocks the related feature (e.g. Gemini “Connected” enables VoiceReach).',
        ],
      },
    ],
    tips: [
      'Use the SES sandbox (verified recipients only) to test campaigns without reaching real prospects.',
      'Stored credentials are encrypted at rest and masked in the UI once saved.',
    ],
    related: ['architecture-settings', 'email-campaigns', 'ai-calling', 'signals'],
  },
  {
    slug: 'profile',
    title: 'Profile & appearance',
    tagline: 'Your identity and the look of your workspace.',
    icon: 'user',
    category: 'Configuration',
    intro: [
      'Profile manages your account identity and the appearance of the entire app. Update your details, and personalize the workspace with a theme and accent color that apply everywhere instantly.',
    ],
    sections: [
      {
        heading: 'End-to-end operator flow',
        steps: [
          'Start: open this feature from the dashboard sidebar and confirm your prerequisites are connected in Settings.',
          'Configure: complete the required fields and selections for your target audience and objective.',
          'Launch: run the action immediately or schedule it for later based on your workflow.',
          'Monitor: watch status, history, and dashboard metrics to confirm progress and outcomes.',
          'Troubleshoot: if results stall, verify credentials, audience data quality, and feature-specific validation messages.',
        ],
      },
      {
        heading: 'Account details',
        body: ['Edit your name, email, title, company, and phone. Your initials and details appear throughout the app, including the sidebar.'],
      },
      {
        heading: 'Themes & accents',
        capabilities: [
          { title: 'Theme families', text: 'Four dark themes (Midnight, Slate, Graphite, Violet) and four light themes (Cloud, Paper, Mint, Rose).' },
          { title: 'Accent colors', text: 'Indigo, Emerald, Sky, Rose, Amber, or Violet — recolors buttons, highlights, and charts.' },
          { title: 'Instant apply', text: 'Selections take effect immediately and persist to your profile.' },
        ],
      },
    ],
    tips: ['Use the quick light/dark toggle in the sidebar footer to flip modes without opening Profile.'],
    related: ['architecture-auth-profile', 'settings'],
  },
];

export function getDocBySlug(slug: string): DocPage | undefined {
  return DOC_PAGES.find((d) => d.slug === slug);
}

export function getDocTrack(doc: DocPage): DocTrack {
  return TECHNICAL_CATEGORIES.has(doc.category)
    ? 'Technical Documentation'
    : 'User Documentation';
}

export function getDocsByTrackAndCategory(): {
  track: DocTrack;
  groups: { category: string; docs: DocPage[] }[];
}[] {
  return DOC_TRACKS.map((track) => {
    const groups = DOC_CATEGORIES.map((category) => {
      const docs = DOC_PAGES.filter(
        (d) => d.category === category && getDocTrack(d) === track,
      );
      return { category, docs };
    }).filter((group) => group.docs.length > 0);

    return { track, groups };
  }).filter((trackGroup) => trackGroup.groups.length > 0);
}

/** Resolve a doc's `related` slugs into full pages (skips any that don't exist). */
export function getDocBySlugRelated(slug: string): DocPage[] {
  const doc = getDocBySlug(slug);
  if (!doc?.related) return [];
  const resolved = doc.related
    .map((s) => getDocBySlug(s))
    .filter((d): d is DocPage => !!d);
  const sameTrack = resolved.filter((d) => getDocTrack(d) === getDocTrack(doc));
  return sameTrack.length > 0 ? sameTrack : resolved;
}
