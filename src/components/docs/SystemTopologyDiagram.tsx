import { Arrow, Box, Group, Key, Lines, Markers, PathArrow, Title, type KeyItem } from './diagram';

const ID = 'topo';

const KEY: readonly KeyItem[] = [
  { box: 'client', label: 'Browser' },
  { box: 'code', label: 'Backend' },
  { box: 'model', label: 'Gemini' },
  { box: 'provider', label: 'Outside service' },
  { box: 'cron', label: 'Cron job' },
  { box: 'store', label: 'Database' },
  { edge: 'req', label: 'Request' },
  { edge: 'live', label: 'Audio / socket' },
  { edge: 'hook', label: 'Webhook' },
];

/** Feature modules as [module, what it owns], listed in two columns. */
const MODULES: readonly (readonly [string, string])[] = [
  ['auth', 'sign-in, refresh, profile'],
  ['settings', 'encrypted keys, tests'],
  ['contacts', 'contacts, directories, CSV'],
  ['templates', 'email copy, AI drafts'],
  ['email-campaigns', 'SES sending'],
  ['ai-calling-bots', 'personas, knowledge'],
  ['calling-campaigns', 'dial, webhooks, recordings'],
  ['signals', 'watches, playbooks, review'],
  ['history', 'sent email, past calls'],
  ['analytics', 'dashboard metrics'],
];

/** The four browser-side pieces, left to right. */
const FRONTEND: readonly { x: number; title: string; mono?: string; lines: string[] }[] = [
  { x: 34, title: 'Product pages', mono: 'app/(dashboard)/*', lines: ['AuthGuard + AppShell', 'wrap every route'] },
  { x: 205, title: 'api.ts', lines: ['Adds the access token', 'On a 401: refresh,', 'then retry once'] },
  { x: 376, title: 'localAuth.ts', lines: ['Tokens, profile and', 'theme in localStorage'] },
  { x: 547, title: 'webpilot-api.ts', lines: ['Starts WebPilot runs', 'and streams events'] },
];

export default function SystemTopologyDiagram() {
  return (
    <svg
      className="arch-svg"
      viewBox="0 0 1040 876"
      role="img"
      aria-label="ReachConvert system topology. In the browser, product pages call the backend through api.ts with a Bearer token; localAuth keeps tokens; webpilot-api talks to the WebPilot service directly. In the NestJS backend, main.ts sets the /api prefix and dispatches WebSocket upgrades to the realtime gateway or the WebPilot proxy. REST requests pass the global AuthGuard into ten feature modules; schedulers call the same modules on a timer. Modules call AWS SES, Gemini text, Twilio or Plivo, and public signal sources, and receive signed webhooks from the phone provider. The realtime gateway bridges phone audio to Gemini Live. Every module persists through MongoService into MongoDB."
    >
      <Markers id={ID} />

      {/* ── Browser ─────────────────────────────────────────────── */}
      <Group x={20} y={20} w={700} h={132} label="BROWSER · AGENTREACH-FRONTEND (NEXT.JS)" />
      {FRONTEND.map((box) => (
        <g key={box.title}>
          <Box x={box.x} y={50} w={159} h={86} kind="client" />
          <text x={box.x + 14} y={72} className="title">
            {box.title}
          </text>
          {box.mono && (
            <text x={box.x + 14} y={93} className="mono">
              {box.mono}
            </text>
          )}
          <Lines x={box.x + 14} y={box.mono ? 110 : 93} step={17} className="body-s" lines={box.lines} />
        </g>
      ))}

      {/* WebPilot service, reached from the browser without the backend */}
      <Box x={790} y={50} w={230} h={86} kind="provider" />
      <text x={806} y={72} className="title">WebPilot service</text>
      <text x={806} y={93} className="mono">WEBPILOT_URL · :8001</text>
      <Lines x={806} y={110} step={17} className="body-s" lines={['Runs browser tasks from', 'a prompt, streams frames']} />
      <Arrow id={ID} x1={706} y1={86} x2={789} y2={86} />
      <text x={748} y={78} textAnchor="middle" className="small">Next rewrite</text>
      <text x={748} y={103} textAnchor="middle" className="small">+ direct WS</text>

      {/* Browser → backend */}
      <Arrow id={ID} x1={284.5} y1={136} x2={284.5} y2={211} />
      <text x={293} y={170} className="strong">REST /api · Bearer token</text>

      {/* ── Backend ─────────────────────────────────────────────── */}
      <Group x={20} y={180} w={700} h={586} label="AGENTREACH-BACKEND · NESTJS 11" />

      <Box x={34} y={212} w={506} h={90} />
      <Title x={34} y={234} w={506} text="main.ts" note="createApp()" />
      <Lines
        x={50}
        y={256}
        step={17}
        lines={[
          '/api prefix · CORS_ORIGINS allow-list · 50 MB request bodies',
          'Swagger at /docs, off in production unless ENABLE_SWAGGER',
          'Upgrades /twilio/stream, /plivo/stream, /ws/webpilot; drops the rest',
        ]}
      />

      <Box x={560} y={212} w={146} h={90} />
      <text x={574} y={234} className="title">WebPilot proxy</text>
      <Lines x={574} y={256} step={17} className="body-s" lines={['Checks the token', 'itself, then', 'forwards it']} />
      <Arrow id={ID} x1={540} y1={257} x2={559} y2={257} />
      <PathArrow id={ID} d="M706,257 H905 V137" />
      <text x={913} y={204} className="mono note">/api/webpilot/*</text>
      <text x={913} y={220} className="mono note">/ws/webpilot</text>

      {/* main.ts fans out */}
      <Arrow id={ID} x1={139} y1={302} x2={139} y2={333} />
      <text x={147} y={322} className="small">REST</text>
      <Arrow id={ID} x1={515} y1={302} x2={515} y2={333} />
      <text x={523} y={322} className="small">upgrade</text>

      <Box x={34} y={334} w={210} h={86} />
      <Title x={34} y={356} w={210} text="Global AuthGuard" />
      <Lines x={50} y={377} step={17} className="body-s" lines={['Checks the Bearer token', 'and loads the user;', '@Public() routes skip it']} />

      <Box x={256} y={334} w={210} h={86} kind="cron" />
      <Title x={256} y={356} w={210} text="Schedulers" note="@Cron" />
      <Lines x={272} y={377} step={17} className="body-s" lines={['Every minute: launch', 'campaigns that are due', 'Every 6 h: poll watches']} />

      <Box x={490} y={334} w={216} h={86} />
      <Title x={490} y={356} w={216} text="Realtime gateway" />
      <Lines x={506} y={377} step={17} className="body-s" lines={['Phone audio ↔ Gemini Live', 'Runs tools, writes the', 'transcript, enforces limits']} />

      <Arrow id={ID} x1={139} y1={420} x2={139} y2={453} />
      <text x={147} y={441} className="small">request + user</text>
      <Arrow id={ID} x1={361} y1={420} x2={361} y2={453} />
      <text x={369} y={441} className="small">launch · poll</text>
      <Arrow id={ID} x1={598} y1={420} x2={598} y2={453} />
      <text x={606} y={441} className="small">bot knowledge</text>

      {/* Feature modules */}
      <Box x={34} y={454} w={672} h={210} />
      <Title x={34} y={478} w={672} text="Feature modules" note="src/<module>/" />
      <line x1={50} y1={492} x2={690} y2={492} className="rule" />
      {MODULES.map(([name, role], i) => {
        const col = Math.floor(i / 5);
        const x = col === 0 ? 50 : 378;
        const y = 516 + (i % 5) * 28;
        return (
          <g key={name}>
            <text x={x} y={y} className="mono mod">
              {name}
            </text>
            <text x={x + 134} y={y} className="body-s muted">
              {role}
            </text>
          </g>
        );
      })}

      <Arrow id={ID} x1={370} y1={664} x2={370} y2={695} />
      <text x={378} y={684} className="small">read / write</text>

      <Box x={34} y={696} w={672} h={56} />
      <Title x={34} y={718} w={672} text="MongoService" note="mongo.service.ts" />
      <text x={50} y={740} className="body-s">
        Prisma-style delegates over 16 Mongoose models, shared by every module and the gateway
      </text>

      {/* ── Database ────────────────────────────────────────────── */}
      <Arrow id={ID} x1={370} y1={752} x2={370} y2={799} />
      <text x={378} y={785} className="small">Mongoose</text>
      <Box x={34} y={800} w={672} h={56} kind="store" />
      <Title x={34} y={822} w={672} text="MongoDB" note="DATABASE_URL" />
      <text x={50} y={844} className="body-s">
        One database for the workspace. Every account reads and writes the same data.
      </text>

      {/* ── Outside services ────────────────────────────────────── */}
      <Box x={790} y={296} w={230} h={90} kind="model" />
      <text x={806} y={318} className="title">Gemini Live</text>
      <text x={806} y={339} className="mono">gemini-3.1-flash-live-preview</text>
      <Lines x={806} y={358} step={17} className="body-s" lines={['One voice session per call,', 'plus a preflight before dialing']} />
      <Arrow id={ID} x1={706} y1={352} x2={789} y2={352} kind="live" both />
      <text x={748} y={344} textAnchor="middle" className="small">PCM audio</text>

      <Box x={790} y={398} w={230} h={104} kind="provider" />
      <text x={806} y={420} className="title">Twilio or Plivo</text>
      <Lines
        x={806}
        y={441}
        step={17}
        className="body-s"
        lines={['Places calls, sends signed', 'webhooks, streams call audio']}
      />
      <text x={806} y={485} className="mono note">callProvider in Settings</text>
      <Arrow id={ID} x1={706} y1={408} x2={789} y2={408} kind="live" both />
      <text x={748} y={400} textAnchor="middle" className="small">μ-law 8 kHz</text>
      <Arrow id={ID} x1={706} y1={470} x2={789} y2={470} />
      <text x={748} y={462} textAnchor="middle" className="small">dial</text>
      <Arrow id={ID} x1={789} y1={488} x2={707} y2={488} kind="hook" />
      <text x={748} y={502} textAnchor="middle" className="small">webhooks</text>

      <Box x={790} y={512} w={230} h={44} kind="provider" />
      <text x={806} y={531} className="title">AWS SES</text>
      <text x={806} y={548} className="mono note">SendEmail · SendRawEmail</text>
      <Arrow id={ID} x1={706} y1={534} x2={789} y2={534} />
      <text x={748} y={527} textAnchor="middle" className="small">send</text>

      <Box x={790} y={566} w={230} h={44} kind="model" />
      <text x={806} y={585} className="title">Gemini text</text>
      <text x={806} y={602} className="mono note">gemini-flash-lite-latest</text>
      <Arrow id={ID} x1={706} y1={588} x2={789} y2={588} />
      <text x={748} y={581} textAnchor="middle" className="small">generate</text>

      <Box x={790} y={620} w={230} h={44} kind="provider" />
      <text x={806} y={639} className="title">Public sources</text>
      <text x={806} y={656} className="body-s">News RSS · SEC EDGAR · job boards</text>
      <Arrow id={ID} x1={706} y1={642} x2={789} y2={642} />
      <text x={748} y={635} textAnchor="middle" className="small">poll</text>

      <Key id={ID} x={790} y={712} items={KEY} rows={5} colWidth={125} />
    </svg>
  );
}
