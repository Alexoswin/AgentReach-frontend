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

export type DocCalloutTone = 'info' | 'tip' | 'warning' | 'danger';

export interface DocCallout {
  tone: DocCalloutTone;
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
  callouts?: DocCallout[];
}

export interface DocPage {
  slug: string;
  title: string;
  /** Search-result title; defaults to "<title> — ReachConvert Docs". */
  seoTitle?: string;
  tagline: string;
  icon: DocIcon;
  category: string;
  intro: string[];
  sections: DocSection[];
  audience?: string;
  prerequisites?: string[];
  lastReviewed?: string;
  tips?: string[];
  related?: string[];
}

export type DocTrack = 'User Documentation' | 'Technical Documentation';

export const DOC_CATEGORIES = [
  'Architecture',
  'Feature architecture',
  'Getting started',
  'Guides',
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
  quickStart: String.raw`flowchart TB
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
    // The body is hand-written in src/components/docs/SystemArchitectureDoc.tsx;
    // this entry only feeds the index, sidebar, metadata and related links.
    intro: [],
    sections: [],
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
    audience: 'Operators setting up their first outreach workflow',
    prerequisites: [
      'A ReachConvert account with access to the dashboard.',
      'At least one delivery provider ready: AWS SES for email or Twilio and Gemini for calling.',
      'A CSV/XLSX file with the contacts you want to reach.',
    ],
    lastReviewed: 'October 2026',
    intro: [
      'ReachConvert unifies personalized bulk email, autonomous AI voice calling, and signal-based automation in one workspace. This guide gets a brand-new account to its first live, tracked campaign.',
    ],
    sections: [
      {
        heading: 'Workspace setup flow',
        body: [
          'A new workspace becomes useful in layers: authenticate, connect at least one provider, import contacts, build the outreach asset, launch or schedule, then measure and automate.',
        ],
        callouts: [
          {
            tone: 'tip',
            title: 'Start with one channel',
            text: 'You do not need to configure every integration before testing the product. Set up email or calling first, complete one small campaign, then add automation once the basics are working.',
          },
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

  // ─────────────────────────────── Guides
  // Problem-first articles written for people searching for how to do
  // outreach, not only for existing users. Each one ends in the product flow.
  {
    slug: 'automate-cold-calls-with-ai',
    title: 'How to automate cold calls with an AI voice agent',
    seoTitle: 'How to Automate Cold Calls with an AI Voice Agent — ReachConvert',
    tagline: 'Set up an AI agent that dials your list, holds a real conversation, and logs every outcome.',
    icon: 'phone',
    category: 'Guides',
    audience: 'Founders, SDRs, and job seekers who make repetitive outbound calls',
    prerequisites: [
      'A Twilio account with a phone number that can make outbound calls.',
      'A Gemini API key (it powers the realtime voice conversation).',
      'A list of contacts with phone numbers, ideally in international format such as +14155550123.',
    ],
    lastReviewed: 'October 2026',
    intro: [
      'Cold calling works, but most of the time goes to dialing, voicemail, and repeating the same opening line. An AI voice agent takes over that repetitive first touch: it calls each contact, introduces itself, has a short back-and-forth conversation toward one goal, and writes down what happened.',
      'This guide covers when AI calling makes sense, how to write an agent people do not hang up on, the rules you need to follow, and the exact steps to run your first campaign in ReachConvert.',
    ],
    sections: [
      {
        heading: 'Where an AI calling agent fits',
        capabilities: [
          { title: 'First-touch qualification', text: 'Confirm interest, the right contact, and timing before a person spends time on the call.' },
          { title: 'Follow-up after email', text: 'Call contacts who opened your email but did not reply, while the message is still fresh.' },
          { title: 'Reminders and confirmations', text: 'Confirm meetings, events, or interviews, and capture reschedules automatically.' },
          { title: 'High-volume lists', text: 'Reach hundreds of contacts in a day without a team of callers.' },
        ],
        callouts: [
          {
            tone: 'info',
            title: 'Keep humans on the important calls',
            text: 'AI agents are strongest at short, structured conversations. Hand complex negotiations and warm leads to a person, using the transcript as context.',
          },
        ],
      },
      {
        heading: 'Write an agent people stay on the line for',
        steps: [
          'Say who is calling and why in the first sentence. Long openers get hang-ups.',
          'Give the agent one goal per campaign, such as booking a meeting or confirming interest, not several.',
          'Write the two or three objections you hear most often and a short answer to each.',
          'Tell the agent to end the call politely and confirm opt-out whenever someone asks not to be called again.',
          'Keep the prompt focused. Long system instructions add latency, and pauses make the call feel robotic.',
        ],
      },
      {
        heading: 'Know the rules before you dial',
        body: [
          'Calling laws differ by country, and automated or AI-voiced calls usually face stricter rules than calls from a person.',
        ],
        callouts: [
          {
            tone: 'warning',
            title: 'Check consent and do-not-call rules',
            text: 'In the US, the FCC ruled in February 2024 that AI-generated voices count as artificial voices under the TCPA, so these calls generally need the recipient’s prior express consent. Many countries run do-not-call registries, such as the UK’s TPS and India’s NCPR. Disclose that the caller is an AI, honour opt-outs immediately, and confirm the rules where you call. This guide is not legal advice.',
          },
        ],
      },
      {
        heading: 'Run your first AI calling campaign in ReachConvert',
        steps: [
          'Open Settings, add your Twilio account SID, auth token, and phone number, then add and test your Gemini API key.',
          'Go to Calling Agents and create an agent: its persona, objective, opening line, objection handling, and any reference knowledge.',
          'Import contacts with phone numbers under Contacts, or reuse an existing directory.',
          'Create a VoiceReach campaign, choose the agent, a voice, and a language, and decide whether the AI speaks first.',
          'Start with five to ten contacts you know, listen to the recordings, and refine the script.',
          'Launch to the full list, or schedule the campaign for a time when people are likely to pick up.',
        ],
      },
      {
        heading: 'Measure and improve',
        body: [
          'The Dashboard shows calls made, call success rate, and average call duration. History stores each call’s outcome, transcript, and recording.',
          'Read the transcripts of calls that ended early. They show exactly which line lost the person, and a fix to the agent applies to every future campaign that uses it.',
        ],
      },
    ],
    tips: [
      'Call during local business hours for the person you are calling, not your own.',
      'Pair calling with email: send the email first, then call the contacts who opened it.',
    ],
    related: ['ai-calling', 'ai-bots', 'settings', 'personalized-bulk-email-without-spam'],
  },
  {
    slug: 'personalized-bulk-email-without-spam',
    title: 'How to send personalized bulk email without landing in spam',
    seoTitle: 'How to Send Personalized Bulk Email Without Landing in Spam',
    tagline: 'Domain authentication, list hygiene, and personalization that keep cold email in the inbox.',
    icon: 'mail',
    category: 'Guides',
    audience: 'Anyone sending cold or bulk email to more than a handful of people',
    prerequisites: [
      'A domain you control, so you can add DNS records.',
      'An AWS account for Amazon SES, which ReachConvert uses to send email.',
    ],
    lastReviewed: 'October 2026',
    intro: [
      'Sending the same email to hundreds of people is easy. Getting it into the inbox, and getting replies, is the hard part. Mailbox providers like Gmail and Outlook judge every message on who sent it, whether the domain is authenticated, how recipients react, and whether it looks like a mass blast.',
      'This guide walks through the setup and habits that keep bulk email out of spam, then shows how to run a personalized campaign in ReachConvert.',
    ],
    sections: [
      {
        heading: '1. Authenticate your sending domain',
        body: [
          'Unauthenticated email is the most common reason bulk mail lands in spam. Set up three DNS records for the domain you send from:',
        ],
        capabilities: [
          { title: 'SPF', text: 'Lists the servers allowed to send for your domain. With SES, set a custom MAIL FROM domain so SPF aligns with your From address.' },
          { title: 'DKIM', text: 'Cryptographically signs each message. Turn on Easy DKIM when you verify your domain in SES and add the CNAME records it gives you.' },
          { title: 'DMARC', text: 'Tells receivers what to do when SPF or DKIM fails. Start with p=none and a reporting address, then tighten it once reports look clean.' },
        ],
        callouts: [
          {
            tone: 'info',
            title: 'Gmail and Yahoo bulk sender rules',
            text: 'Since February 2024, Gmail and Yahoo require bulk senders to authenticate with SPF and DKIM, publish a DMARC policy, make unsubscribing easy, and keep spam complaint rates low. Set this up before you send at volume.',
          },
        ],
      },
      {
        heading: '2. Leave the SES sandbox and warm up',
        steps: [
          'New SES accounts start in the sandbox, which can only send to verified addresses. Use it to test, then request production access from the SES console.',
          'Start with small daily volumes from a new domain or address and increase them gradually over a few weeks.',
          'Send your first campaigns to the contacts most likely to engage. Early replies and opens build sender reputation.',
        ],
      },
      {
        heading: '3. Keep your list clean',
        body: [
          'Bounces and spam complaints damage your reputation faster than anything else. AWS recommends keeping your bounce rate below 5% and your complaint rate below 0.1%, and may pause sending from accounts that go well beyond those levels.',
        ],
        steps: [
          'Verify addresses before importing a purchased or scraped list, and remove anything that fails.',
          'Remove hard bounces after every campaign. History shows which recipients failed.',
          'Give every email a clear way to opt out, and remove people who ask straight away.',
        ],
      },
      {
        heading: '4. Personalize beyond the first name',
        body: [
          'A first name in the greeting no longer convinces anyone. Personalization that works refers to something specific about the person or their company.',
          'In ReachConvert, every column in your contact import becomes a template variable, so you can reference a person’s role, industry, or a note you wrote about them. Signal variables go further and reference a real event, like a funding round or a new product.',
        ],
        code: {
          caption: 'A template that uses contact fields and a custom column',
          lines: [
            'Subject: {{company}} + quick idea for {{jobTitle}}s',
            '',
            'Hi {{firstName}},',
            '',
            'I noticed {{company}} works in {{industry}}. Teams like yours usually ...',
          ],
        },
      },
      {
        heading: '5. Write like a person, not a newsletter',
        steps: [
          'Keep it short: a few sentences, one clear question, and no attachments on the first email.',
          'Use one or two links at most, and avoid link shorteners, which spam filters distrust.',
          'Prefer plain text or light HTML. Image-heavy layouts read as marketing.',
          'Generate a draft with AI, then edit it so it sounds like you.',
        ],
      },
      {
        heading: 'Send your first campaign in ReachConvert',
        steps: [
          'Open Settings, add your SES access key, secret, region, and verified sender address, then click Test SES.',
          'Import contacts under Contacts, mapping your columns so they become template variables.',
          'Create a template under MailReach, by hand or with AI generation.',
          'Create a campaign, launch it to a small directory of your own addresses first, and check the result.',
          'Launch to the real audience, then watch delivery, opens, and replies on the Dashboard.',
        ],
        callouts: [
          {
            tone: 'tip',
            title: 'Judge results by replies',
            text: 'Some mail apps, such as Apple Mail with Mail Privacy Protection, load tracking pixels automatically, which inflates open rates. Reply rate is the more reliable signal of what is working.',
          },
        ],
      },
    ],
    tips: [
      'Send cold outreach from a separate subdomain, such as mail.yourcompany.com, so it cannot harm your main domain’s reputation.',
      'Use the Template Performance table on the Dashboard to retire templates with low reply rates.',
    ],
    related: ['email-campaigns', 'settings', 'contacts', 'signal-based-outreach'],
  },
  {
    slug: 'signal-based-outreach',
    title: 'Signal-based outreach: reach prospects when they are ready',
    seoTitle: 'Signal-Based Outreach: Reach Prospects When They Are Ready to Buy',
    tagline: 'Use funding rounds, hiring surges, and company news to time outreach and write messages that feel relevant.',
    icon: 'radar',
    category: 'Guides',
    audience: 'Sales teams, founders, and job seekers targeting specific companies',
    lastReviewed: 'October 2026',
    intro: [
      'Most cold outreach fails on timing, not wording. The same message that gets ignored today might get a reply the week a company raises money, starts hiring for a team, or launches a product, because that is when its priorities change.',
      'Signal-based outreach means watching your target accounts for those events and reaching out soon after, with a message that refers to what just happened.',
    ],
    sections: [
      {
        heading: 'Signals worth acting on',
        capabilities: [
          { title: 'Funding round', text: 'New budget and pressure to grow. Congratulate them, then connect your offer to what they are about to scale.' },
          { title: 'Hiring surge', text: 'Many open roles in one area points to a growing team and growing pains. Speak to the problems that growth creates.' },
          { title: 'Product launch', text: 'The team is focused on adoption and feedback. Offer something that helps the launch land.' },
          { title: 'Company news', text: 'Acquisitions, expansions, and new markets. Refer to the specific change, not the company in general.' },
          { title: 'Job change', text: 'When a contact leaves, their replacement is new to the role and open to new tools, and your old contact may buy again at their new company.' },
        ],
      },
      {
        heading: 'Match the message to the event',
        body: [
          'A signal is only useful if the message refers to it. Open with the event, connect it to a problem it usually creates, and ask one easy question.',
        ],
        code: {
          caption: 'A playbook template using signal variables',
          lines: [
            'Subject: Congrats on the {{signal.type}}, {{firstName}}',
            '',
            'Hi {{firstName}},',
            '',
            'Saw the news: {{signal.summary}}',
            'Teams usually start scaling outreach right after a moment like this.',
            'Would a 15-minute look at how {{company}} could automate it be useful?',
          ],
        },
      },
      {
        heading: 'Set it up in ReachConvert',
        steps: [
          'Import your target contacts. ReachConvert starts watching each contact’s company domain automatically, skipping free-mail domains.',
          'Open Signals to see detected events. Collectors check Google News, SEC EDGAR filings, and public job boards on a schedule, or click Scan now.',
          'Create a playbook: choose the signal types, the audience (a directory or everyone), and the template to send.',
          'Start in Review mode so each triggered email waits in the Review Queue for your approval.',
          'Switch to Auto mode once the drafts consistently look right.',
        ],
        callouts: [
          {
            tone: 'warning',
            title: 'Guardrails protect your sending reputation',
            text: 'Each playbook has a per-contact cooldown (30 days by default), a daily send cap (50 by default), and duplicate suppression, so one busy news week cannot flood your contacts or your domain.',
          },
        ],
      },
      {
        heading: 'Measure the lift',
        body: [
          'Signal-triggered emails are tracked separately from manual campaigns, so you can compare their reply rate against your regular sends and see whether timing is paying off.',
        ],
      },
    ],
    tips: [
      'Add a manual signal with Add signal when you learn something offline, such as meeting someone at a conference.',
      'Keep company names and email domains consistent in your imports so signals match the right contacts.',
    ],
    related: ['signals', 'contacts', 'email-campaigns', 'personalized-bulk-email-without-spam'],
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
        callouts: [
          {
            tone: 'warning',
            title: 'Review before enabling Auto mode',
            text: 'Use Review mode while validating signal quality and template variables. Switch to Auto mode only after confirming the audience, cooldown, and daily cap match your sending policy.',
          },
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
    audience: 'Operators running personalized email outreach',
    prerequisites: [
      'AWS SES credentials and a verified sender address in Settings.',
      'At least one contact or directory to use as the campaign audience.',
      'A template with a subject and body, either written manually or generated with AI.',
    ],
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
        callouts: [
          {
            tone: 'info',
            title: 'Test with a small audience first',
            text: 'Send to a short internal or test list before launching to a full directory. This verifies merge fields, sender configuration, and the resulting tracking events.',
          },
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
    audience: 'Operators running automated voice campaigns',
    prerequisites: [
      'Twilio credentials and a caller phone number in Settings.',
      'A Gemini API key for realtime voice conversations.',
      'Contacts with valid phone numbers and a saved Calling Agent.',
    ],
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
    audience: 'Workspace administrators and campaign operators',
    prerequisites: ['Provider credentials from AWS, Twilio, or Google, depending on the channels you plan to use.'],
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
        callouts: [
          {
            tone: 'danger',
            title: 'Keep provider credentials private',
            text: 'Enter credentials only in Settings. Do not place access keys in templates, contact fields, screenshots, or frontend environment variables that are exposed to the browser.',
          },
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
          { title: 'Theme families', text: 'Match system (the default) follows your device’s light or dark setting. Or pick one of four dark themes (Void, Deepwater, Carbon, Nebula) or four light themes (Porcelain, Parchment, Greenhouse, Blush).' },
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

/** Navigation follows the order used by the overview and sidebar. */
export function getDocNavigation(slug: string): {
  previous?: DocPage;
  next?: DocPage;
} {
  const index = DOC_PAGES.findIndex((doc) => doc.slug === slug);
  if (index < 0) return {};
  return {
    previous: DOC_PAGES[index - 1],
    next: DOC_PAGES[index + 1],
  };
}
