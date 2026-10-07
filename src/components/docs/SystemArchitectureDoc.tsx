import type { ReactNode } from 'react';
import OutboundCallDiagram from './OutboundCallDiagram';
import SystemTopologyDiagram from './SystemTopologyDiagram';

/**
 * Body of /documentation/architecture. Unlike the data-driven pages in
 * src/lib/docs.ts, this page is hand-written: two hand-drawn SVG diagrams plus
 * reference tables, all styled by the `.arch` rules in globals.css.
 */

type Kind = 'rest' | 'webhook' | 'realtime' | 'cron' | 'code' | 'model' | 'provider' | 'tool';

function Pill({ kind, children }: { kind: Kind; children?: ReactNode }) {
  return <span className={`arch-kind arch-kind-${kind}`}>{children ?? kind}</span>;
}

/** First table cell: a bold name with an optional mono file or function under it. */
function Name({ children, file }: { children: ReactNode; file?: string }) {
  return (
    <>
      {children}
      {file && <span className="arch-file">{file}</span>}
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="arch-section">
      <h2>
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children}
    </section>
  );
}

const MODULES: readonly {
  name: string;
  file: string;
  kinds: Kind[];
  owns: string;
  calls: string;
  stores: string;
  sub?: boolean;
}[] = [
  { name: 'auth', file: 'auth/', kinds: ['rest'], owns: 'Sign-up, login, token refresh, password reset, profile', calls: 'none', stores: 'User' },
  { name: 'settings', file: 'settings/', kinds: ['rest'], owns: 'Provider keys, encrypted at rest, and a test button per provider', calls: 'SES, Twilio, Plivo, Gemini (tests only)', stores: 'SystemSettings' },
  { name: 'contacts', file: 'contacts/', kinds: ['rest'], owns: 'Contacts, directories, CSV parsing and import', calls: 'none', stores: 'Contact, ContactDirectory' },
  { name: 'templates', file: 'templates/', kinds: ['rest'], owns: 'Email templates, AI drafts, reference PDFs', calls: 'Gemini text', stores: 'Template' },
  { name: 'email-campaigns', file: 'email-campaigns/', kinds: ['rest'], owns: 'Campaigns, recipients, schedule, launch, relaunch', calls: 'AWS SES', stores: 'EmailCampaign, EmailCampaignContact' },
  { name: 'ai-calling-bots', file: 'bot/', kinds: ['rest'], owns: 'Calling personas and their knowledge, from text or a PDF', calls: 'none, embeddings are computed locally', stores: 'AiCallingBot, AiCallingBotEmbedding' },
  { name: 'calling-campaigns', file: 'calling-campaigns/', kinds: ['rest', 'webhook'], owns: 'Campaigns, dialing, provider callbacks, recordings', calls: 'Twilio or Plivo, Gemini Live preflight', stores: 'CallingCampaign, CallHistory' },
  { name: 'realtime-calling', file: 'realtime-calling/', kinds: ['realtime'], owns: 'The media sockets and the live Gemini session', calls: 'Gemini Live', stores: 'CallHistory', sub: true },
  { name: 'signals', file: 'signals/', kinds: ['rest', 'cron'], owns: 'Watches, collectors, playbooks, review queue', calls: 'News RSS, EDGAR, job boards, Gemini text', stores: 'CompanyWatch, Signal, SignalMatch, Playbook, TriggeredOutreach' },
  { name: 'scheduler', file: 'scheduler/', kinds: ['cron'], owns: 'Launches campaigns whose scheduled time has passed', calls: 'none, it calls the campaign services', stores: 'EmailCampaign, CallingCampaign' },
  { name: 'history', file: 'history/', kinds: ['rest'], owns: 'Sent email and past calls', calls: 'none', stores: 'reads only' },
  { name: 'analytics', file: 'analytics/', kinds: ['rest'], owns: 'Dashboard metrics', calls: 'none', stores: 'reads only' },
];

const FILES: readonly { group: string; rows: readonly (readonly [string, ReactNode])[] }[] = [
  {
    group: 'Backend · AgentReach-backend/src',
    rows: [
      ['main.ts', <>Boots Nest, sets the <code>/api</code> prefix, CORS and Swagger, and routes WebSocket upgrades. Exports a handler for Vercel and listens everywhere else.</>],
      ['app.module.ts', 'Registers Mongo, every feature module and both schedulers.'],
      ['auth/auth.guard.ts', <>The global guard: Bearer token, user lookup, <code>@Public()</code> bypass.</>],
      ['auth/secrets.ts', 'JWT secret rules and the HMAC call tokens on provider callback URLs.'],
      ['settings/credential-encryption.ts', 'AES-256-GCM for provider keys, and the masking used in every response.'],
      ['mongo.service.ts', <>Prisma-style delegates over the 16 Mongoose models in <code>schemas/</code>.</>],
      ['email-campaigns/email-campaigns.service.ts', 'Launch checks, background SES sending, throttling retry.'],
      ['calling-campaigns/calling-campaigns.service.ts', 'Launch, Gemini preflight, dialing, webhooks, recordings.'],
      ['realtime-calling/realtime-calling.gateway.ts', 'The live call: sockets, Gemini session, noise gate, timers, transcript.'],
      ['realtime-calling/audio-codec.ts', 'μ-law and PCM16 conversion and resampling.'],
      ['realtime-calling/call-tools.ts', <><code>end_call</code> and <code>fetch_context</code>.</>],
      ['realtime-calling/call-monitor.hub.ts', 'In-process pub/sub for watching a call live. It is registered, but nothing publishes to it yet.'],
      ['bot/bot.service.ts', 'Knowledge chunking, local embeddings, cosine search.'],
      ['signals/ingestion.service.ts', 'The signal pipeline, from dedup to playbooks.'],
      ['signals/trigger.service.ts', 'Guardrails and the one-contact email campaign.'],
      ['signals/scheduler.service.ts', 'The six-hourly collector poll.'],
      ['scheduler/campaign-scheduler.service.ts', 'The every-minute campaign launcher.'],
    ],
  },
  {
    group: 'Frontend · AgentReach-frontend',
    rows: [
      ['src/lib/api.ts', 'The REST client: access token, refresh and retry, friendly errors.'],
      ['src/lib/localAuth.ts', 'Tokens, profile and theme in localStorage.'],
      ['next.config.ts', <>Rewrites <code>/api/*</code> to the backend.</>],
      ['src/components/docs/', 'This page and its two diagrams.'],
      ['src/lib/docs.ts', 'Content for every other documentation page.'],
    ],
  },
];

export default function SystemArchitectureDoc() {
  return (
    <div className="arch">
      <p className="arch-lead">
        ReachConvert is two apps. The Next.js workspace runs in the operator&apos;s browser. The NestJS backend owns
        everything else: sign-in, encrypted provider keys, MongoDB, sending, scheduled jobs, signal polling and live
        phone calls. Almost all traffic is REST under <code>/api</code>. Live calls are the exception: the phone
        provider streams audio into the backend over a WebSocket, and the backend bridges it to Gemini Live.
      </p>

      <Section id="whole-system" title="The whole system">
        <p>
          Product pages reach the backend through one client, <code>src/lib/api.ts</code>, which attaches the access
          token. On the backend, <code>main.ts</code> sets the <code>/api</code> prefix and hands the phone
          provider&apos;s WebSocket upgrades to the realtime gateway. Every other request passes the global{' '}
          <code>AuthGuard</code> into a feature module, and every module stores data through <code>MongoService</code>.
        </p>

        <figure className="arch-figure">
          <div className="arch-figure-scroll">
            <SystemTopologyDiagram />
          </div>
          <figcaption>
            Schedulers call the same services the REST routes use, so a scheduled launch and a button click run the
            same code. The phone provider meets the backend three ways: the backend dials it over REST, it calls back
            on signed webhooks, and it streams the call&apos;s audio into the gateway. Any other WebSocket upgrade is
            dropped, so those media streams are the only sockets the backend accepts.
          </figcaption>
        </figure>

        <div className="arch-note">
          <strong>Where long work runs:</strong> nothing slow happens inside the request that starts it. Launching an
          email campaign marks it <code>RUNNING</code> and sends in the background, one recipient every 250 ms.
          Launching a calling campaign returns once each call is placed, and the conversations happen later on the
          gateway as contacts pick up. All of it runs inside the backend process. Deployed as a Vercel function, the
          backend still serves REST, but its WebSocket upgrade handler never receives traffic, so live calls need a
          long-running deploy such as Render or a local server.
        </div>
      </Section>

      <Section id="access" title="Who can call what">
        <p>
          The guard is registered globally, so every route is private unless it opts out with{' '}
          <code>@Public()</code>. Opting out does not mean unchecked. Routes the phone provider calls carry their own
          proof instead of a user token.
        </p>
        <div className="arch-grid">
          <div className="arch-card arch-card-lock">
            <h4>Needs a Bearer access token</h4>
            <ul>
              <li>Every route by default. The guard verifies the token, then loads the user, so a deleted account is refused.</li>
              <li>Settings, where the provider keys live. Responses always return those keys masked.</li>
              <li>Call recordings, which the backend proxies from the provider instead of linking to them.</li>
            </ul>
          </div>
          <div className="arch-card arch-card-warn">
            <h4>Public, but signed per call</h4>
            <ul>
              <li>The sign-in endpoints: register, login, refresh, forgot-password and reset-password.</li>
              <li>
                Twilio and Plivo answer, status and recording webhooks under <code>/api/calling-campaigns</code>.
              </li>
              <li>
                The <code>/twilio/stream</code> and <code>/plivo/stream</code> media sockets.
              </li>
              <li>
                Every URL handed to the provider carries an HMAC of the call id. A webhook with a bad token gets a 403,
                and a socket with a bad token is closed at its start frame.
              </li>
            </ul>
          </div>
        </div>
        <div className="arch-note">
          <strong>Sessions in the browser:</strong> <code>localAuth.ts</code> keeps the access and refresh tokens in
          localStorage. When a request comes back 401, <code>api.ts</code> calls <code>/auth/refresh</code> once, saves
          the new pair and retries the original request. A second 401 surfaces as a session-expired error.
        </div>
      </Section>

      <Section id="modules" title="Which module does what">
        <p>
          Each feature is a NestJS module under <code>AgentReach-backend/src</code>. The kind says how work reaches
          it: a REST route, a provider webhook, a media socket or a cron job.
        </p>
        <div className="arch-table-wrap">
          <table className="arch-table arch-steps">
            <thead>
              <tr>
                <th>Module</th>
                <th>Kind</th>
                <th>Owns</th>
                <th>Calls out to</th>
                <th>Collections</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.name} className={m.sub ? 'sub' : undefined}>
                  <td>
                    <Name file={m.file}>{m.name}</Name>
                  </td>
                  <td>
                    <span className="arch-pills">
                      {m.kinds.map((k) => (
                        <Pill key={k} kind={k} />
                      ))}
                    </span>
                  </td>
                  <td>{m.owns}</td>
                  <td>{m.calls}</td>
                  <td className="mono">{m.stores}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="outbound-call" title="One outbound call, end to end">
        <p>
          A calling campaign holds one <code>CallHistory</code> row per contact. Launching it dials each contact in
          turn. The conversation runs later, on the realtime gateway, which bridges the phone line to a Gemini Live
          session.
        </p>

        <figure className="arch-figure">
          <div className="arch-figure-scroll">
            <OutboundCallDiagram />
          </div>
          <figcaption>
            Steps 0 to 2 run inside the launch request, once per contact. Steps 3 to 5 run when that contact answers,
            driven by the provider. The preflight session and the call session are separate Gemini connections: the
            first only proves the key and model work, then closes. Twilio Media Streams and Plivo Audio Streams share
            one JSON envelope and the same μ-law 8 kHz audio, so a single gateway serves both. Only the outbound frame
            shapes differ.
          </figcaption>
        </figure>

        <div className="arch-table-wrap">
          <table className="arch-table arch-steps">
            <thead>
              <tr>
                <th>Step</th>
                <th>Kind</th>
                <th>Runs in</th>
                <th>Talks to</th>
                <th>CallHistory after</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Name file="launch()">0 · Launch</Name></td>
                <td><Pill kind="code" /></td>
                <td>The launch request</td>
                <td>none</td>
                <td>PENDING; relaunch resets every row</td>
              </tr>
              <tr>
                <td><Name file="preflightGeminiLiveCall()">1 · Preflight</Name></td>
                <td><Pill kind="model" /></td>
                <td>The launch request</td>
                <td>Gemini Live, setup only</td>
                <td>FAILED with the error, if setup fails</td>
              </tr>
              <tr>
                <td><Name file="createTwilioCall() / createPlivoCall()">2 · Dial</Name></td>
                <td><Pill kind="provider" /></td>
                <td>The launch request</td>
                <td>Twilio or Plivo REST</td>
                <td>QUEUED, with the provider call id</td>
              </tr>
              <tr>
                <td><Name file="handleTwilioAnswer()">3 · Answer</Name></td>
                <td><Pill kind="webhook" /></td>
                <td>Public webhook, signed</td>
                <td>Returns the stream XML</td>
                <td>IN_PROGRESS</td>
              </tr>
              <tr>
                <td><Name file="RealtimeCallingGateway">4 · Live call</Name></td>
                <td><Pill kind="realtime" /></td>
                <td>The media socket</td>
                <td>Gemini Live call session</td>
                <td>Each turn appended to the transcript</td>
              </tr>
              <tr className="sub">
                <td><Name file="call-tools.ts">end_call</Name></td>
                <td><Pill kind="tool" /></td>
                <td>A Gemini tool call</td>
                <td>none</td>
                <td>endCallReason; hangs up after the last audio</td>
              </tr>
              <tr className="sub">
                <td><Name file="call-tools.ts">fetch_context</Name></td>
                <td><Pill kind="tool" /></td>
                <td>A Gemini tool call</td>
                <td>Bot knowledge, 2.5 s timeout</td>
                <td>nothing</td>
              </tr>
              <tr>
                <td><Name file="completeCall()">5 · Complete</Name></td>
                <td><Pill kind="code" /></td>
                <td>The gateway</td>
                <td>none</td>
                <td>COMPLETED; the campaign completes when no call is left</td>
              </tr>
              <tr>
                <td><Name file="handleTwilioStatus()">Status, recording</Name></td>
                <td><Pill kind="webhook" /></td>
                <td>Public webhook, signed</td>
                <td>none</td>
                <td>Provider status, duration, recording</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="arch-note">
          <strong>Why the first words come quickly:</strong> the stream URL carries the call id, so the gateway starts
          connecting to Gemini the moment the socket opens, before the provider&apos;s start frame arrives. It asks for
          the greeting straight away and holds up to about 20 seconds of that audio until the stream id is known. The
          campaign&apos;s response-speed preset then decides who owns turn-taking. <em>Fast</em> uses manual activity
          detection driven by the gateway&apos;s noise gate; <em>balanced</em> and <em>conservative</em> let
          Gemini&apos;s own voice detection decide.
        </div>
      </Section>

      <Section id="signals" title="When a signal sends email on its own">
        <p>
          Three collectors poll each active company watch every six hours: news RSS, SEC EDGAR and job boards.
          Operators can also add signals by hand or post SES bounces. Every signal then goes through{' '}
          <code>IngestionService.ingest()</code>, and only a narrow case sends email without a person approving it.
        </p>
        <div className="arch-table-wrap">
          <table className="arch-table arch-steps">
            <thead>
              <tr>
                <th>Step</th>
                <th>Kind</th>
                <th>What happens</th>
                <th>Stops here when</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 · Dedup</td>
                <td><Pill kind="code" /></td>
                <td>Hashes the raw signal.</td>
                <td>The same hash arrived in the last 14 days.</td>
              </tr>
              <tr>
                <td>2 · Classify</td>
                <td><Pill kind="model" /></td>
                <td>
                  Gemini picks the signal type and extracts entities. A keyword heuristic answers when no key is set or
                  the call fails.
                </td>
                <td>Never.</td>
              </tr>
              <tr>
                <td>3 · Save</td>
                <td><Pill kind="code" /></td>
                <td>
                  Stores the signal. A second source on the same company within 7 days raises its confidence one tier.
                </td>
                <td>Never.</td>
              </tr>
              <tr>
                <td>4 · Match</td>
                <td><Pill kind="code" /></td>
                <td>Finds contacts by email domain, rated high, or by normalised company name, rated medium.</td>
                <td>The type is news-other, or no contact matches.</td>
              </tr>
              <tr>
                <td>5 · Playbooks</td>
                <td><Pill kind="code" /></td>
                <td>Picks active playbooks for this signal type whose directories include the contact.</td>
                <td>No playbook applies. The match is still kept for the feed.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="arch-grid">
          <div className="arch-card arch-card-ok">
            <h4>Fires on its own</h4>
            <ul>
              <li>The playbook&apos;s mode is auto</li>
              <li>The match came from the contact&apos;s email domain, so its confidence is high</li>
              <li>The contact and company pairing has not been suppressed</li>
              <li>TriggerService&apos;s guardrails pass</li>
            </ul>
          </div>
          <div className="arch-card arch-card-warn">
            <h4>Waits in the review queue</h4>
            <ul>
              <li>The playbook&apos;s mode is review</li>
              <li>The match came from the company name only, even under an auto playbook</li>
              <li>Approving runs the same TriggerService; rejecting records the note</li>
              <li>Two rejections of the same contact and company suppress the pairing, so it stops coming back</li>
            </ul>
          </div>
        </div>
        <div className="arch-note">
          <strong>TriggerService has the last word.</strong> It skips a contact who already got this signal, a contact
          inside the playbook&apos;s cooldown window, and a playbook that reached its daily cap. When it fires, it
          copies the playbook&apos;s template with the <code>{'{{signal.*}}'}</code> values filled in, creates a
          one-contact email campaign, launches it through the normal email pipeline and records a{' '}
          <code>TriggeredOutreach</code> row for attribution.
        </div>
      </Section>

      <Section id="data" title="Where the data lives">
        <p>
          <code>MongoService</code> wraps 16 Mongoose models in Prisma-style delegates such as <code>findMany</code>,{' '}
          <code>findUnique</code>, <code>create</code> and <code>update</code>, and maps Mongo&apos;s <code>_id</code> to{' '}
          <code>id</code>. Services read like a relational client while MongoDB stays the store. All accounts share one
          workspace, which is why sign-up is closed in production unless <code>ALLOW_REGISTRATION</code> is set.
        </p>
        <div className="arch-table-wrap">
          <table className="arch-table">
            <thead>
              <tr>
                <th>Collection</th>
                <th>Written by</th>
                <th>Read by</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>User</td><td>auth</td><td>AuthGuard, on every request</td></tr>
              <tr><td>SystemSettings</td><td>settings, as one row with encrypted credentials</td><td>Every provider call</td></tr>
              <tr><td>Contact, ContactDirectory</td><td>contacts</td><td>Campaigns, signal matching, playbooks</td></tr>
              <tr><td>Template</td><td>templates; TriggerService saves signal copies</td><td>email-campaigns, analytics</td></tr>
              <tr><td>EmailCampaign, EmailCampaignContact</td><td>email-campaigns, scheduler, TriggerService</td><td>History, analytics</td></tr>
              <tr><td>AiCallingBot, AiCallingBotEmbedding</td><td>ai-calling-bots</td><td>calling-campaigns, the gateway</td></tr>
              <tr><td>CallingCampaign, CallHistory</td><td>calling-campaigns, webhooks, the gateway</td><td>History, analytics, recordings</td></tr>
              <tr><td>CompanyWatch</td><td>signals</td><td>The signal poller</td></tr>
              <tr><td>Signal, SignalMatch</td><td>IngestionService, the review queue</td><td>The signals feed, the review queue</td></tr>
              <tr><td>Playbook</td><td>signals</td><td>IngestionService, TriggerService</td></tr>
              <tr><td>TriggeredOutreach</td><td>TriggerService</td><td>Signal stats, the guardrails</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="background" title="Background work">
        <p>
          Two cron jobs and two kinds of in-process work run outside any request. None of them is a separate worker;
          they share the backend process.
        </p>
        <div className="arch-table-wrap">
          <table className="arch-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Runs</th>
                <th>What it does</th>
                <th>When it fails</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Name file="campaign-scheduler.service.ts">Campaign scheduler</Name></td>
                <td>Every minute</td>
                <td>Launches email and calling campaigns whose <code>scheduledAt</code> has passed.</td>
                <td>Logs the error and returns the campaign to DRAFT, so it is not retried every minute.</td>
              </tr>
              <tr>
                <td><Name file="signals/scheduler.service.ts">Signal poller</Name></td>
                <td>Every 6 hours, or Run now</td>
                <td>Runs each enabled collector for each active watch.</td>
                <td>Logs and skips that collector. A poll that starts while one is running is dropped.</td>
              </tr>
              <tr>
                <td><Name file="runBackgroundSending()">Email sending</Name></td>
                <td>After a launch</td>
                <td>Sends to each PENDING recipient, 250 ms apart.</td>
                <td>
                  A throttled send is retried once. A recipient that still fails is marked FAILED, and launching again
                  retries only those.
                </td>
              </tr>
              <tr>
                <td><Name file="RealtimeCallingGateway">Live call</Name></td>
                <td>Per answered call</td>
                <td>Holds the gateway session and its Gemini connection.</td>
                <td>
                  Ends at 10 minutes, after two silent 15 s checks, or past <code>GEMINI_MAX_CALL_TOKENS</code>, 600k by
                  default.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="why" title="Why it is built this way">
        <ul className="arch-notes">
          <li>
            <strong>Provider keys live in the database.</strong>
            <p>
              Settings encrypts them with AES-256-GCM before saving and always returns them masked. Operators change
              keys without a redeploy; <code>GEMINI_API_KEY</code> in the environment is only a fallback.
            </p>
          </li>
          <li>
            <strong>Webhooks are public but signed.</strong>
            <p>
              Twilio and Plivo cannot send a user token, so each callback URL carries an HMAC of its call id, keyed with{' '}
              <code>JWT_SECRET</code>. A forged URL gets a 403.
            </p>
          </li>
          <li>
            <strong>Gemini is checked before the phone rings.</strong>
            <p>
              The preflight session catches a bad key or model on the call row, so a contact never answers into
              silence.
            </p>
          </li>
          <li>
            <strong>One gateway, two phone providers.</strong>
            <p>
              Both providers stream μ-law 8 kHz in the same event envelope. Only the outbound audio, clear and mark
              frames branch on the provider.
            </p>
          </li>
          <li>
            <strong>Bot knowledge is embedded locally.</strong>
            <p>
              Chunks become 384-dimension hashed word vectors, so training and <code>fetch_context</code> make no API
              call and stay fast enough for a live call. The trade-off is keyword recall rather than semantic search.
            </p>
          </li>
          <li>
            <strong>Signals only send on their own for the strongest match.</strong>
            <p>
              An email-domain match under an auto playbook fires. Anything weaker waits for a person, and repeated
              rejections suppress the pairing.
            </p>
          </li>
          <li>
            <strong>Launching twice never double-sends.</strong>
            <p>
              A second launch retries only FAILED recipients. Re-sending to everyone, including those already SENT, is
              a separate relaunch the operator has to choose.
            </p>
          </li>
        </ul>
      </Section>

      <Section id="run" title="Run it yourself">
        <p>
          Each app runs on its own. The backend needs MongoDB and a JWT secret; provider keys are entered later in
          Settings.
        </p>
        <pre className="arch-code">{`# Backend: REST on :3001/api, Swagger on :3001/docs
cd AgentReach-backend
npm install
cp .env.example .env      # set DATABASE_URL and JWT_SECRET
npm run start:dev

# Frontend: app on :3000, these docs on :3000/documentation
cd AgentReach-frontend
npm install
# in .env.local: NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev`}</pre>
        <div className="arch-note">
          Live calls need the provider to reach you. Set <code>PUBLIC_API_URL</code> to a public HTTPS address, such
          as a tunnel to port 3001, and <code>PUBLIC_WS_URL</code> if the socket host differs. With Twilio or Plivo
          keys that contain &ldquo;mock&rdquo; or &ldquo;test&rdquo;, launches simulate the calls, so the rest of the
          flow can be exercised without a phone line.
        </div>
      </Section>

      <Section id="files" title="File map">
        <div className="arch-table-wrap">
          <table className="arch-table arch-files">
            <thead>
              <tr>
                <th>File</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {FILES.map((group) => [
                <tr key={group.group} className="group-row">
                  <td colSpan={2}>{group.group}</td>
                </tr>,
                ...group.rows.map(([file, role]) => (
                  <tr key={file}>
                    <td>{file}</td>
                    <td>{role}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
