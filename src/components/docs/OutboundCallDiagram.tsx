import { Arrow, Box, Group, Key, Lines, Markers, PathArrow, Title, type KeyItem } from './diagram';

const ID = 'call';

const KEY: readonly KeyItem[] = [
  { box: 'code', label: 'Backend code' },
  { box: 'model', label: 'Gemini Live' },
  { box: 'provider', label: 'Phone provider' },
  { box: 'tool', label: 'Gateway tool' },
  { box: 'store', label: 'Database' },
  { box: 'cron', label: 'Cron job' },
  { edge: 'req', label: 'Request' },
  { edge: 'live', label: 'Live audio' },
  { edge: 'hook', label: 'Webhook' },
];

export default function OutboundCallDiagram() {
  return (
    <svg
      className="arch-svg"
      viewBox="0 0 1040 1170"
      role="img"
      aria-label="One outbound AI call. The dashboard or the campaign scheduler launches a calling campaign. Step 0 checks provider keys and contacts. Step 1 preflights a Gemini Live session and closes it. Step 2 places the call through the Twilio or Plivo REST API with signed callback URLs. Step 3, when the contact answers, the answer webhook returns a stream instruction pointing at the media socket. Step 4, the realtime gateway bridges phone audio to a new Gemini Live session, runs the end_call and fetch_context tools, and enforces call limits. Step 5 marks the call completed and completes the campaign when no call is left. Everything is stored on the CallHistory row."
    >
      <Markers id={ID} />

      <Key id={ID} x={500} y={34} items={KEY} rows={3} colWidth={180} />

      {/* ── Entry points ────────────────────────────────────────── */}
      <Box x={40} y={24} w={190} h={72} />
      <text x={56} y={48} className="title">Dashboard</text>
      <text x={56} y={68} className="mono">POST /:id/launch</text>
      <text x={56} y={86} className="small">or /:id/relaunch</text>

      <Box x={250} y={24} w={190} h={72} kind="cron" />
      <text x={266} y={48} className="title">Campaign scheduler</text>
      <text x={266} y={68} className="mono">@Cron every minute</text>
      <text x={266} y={86} className="small">once scheduledAt passes</text>

      <Arrow id={ID} x1={135} y1={96} x2={135} y2={135} />
      <Arrow id={ID} x1={345} y1={96} x2={345} y2={135} />

      {/* ── 0 · Launch ──────────────────────────────────────────── */}
      <Box x={40} y={136} w={400} h={96} />
      <Title x={40} y={160} w={400} text="0 · Launch" note="launch()" />
      <Lines
        x={56}
        y={182}
        lines={[
          'Needs Twilio or Plivo keys and contacts with phone',
          'numbers. Keys containing "mock" or "test" simulate',
          'the calls instead. Relaunch resets every row first.',
        ]}
      />

      <Arrow id={ID} x1={240} y1={232} x2={240} y2={271} />
      <text x={250} y={256} className="small">each contact, one after another</text>

      {/* ── 1 · Preflight ───────────────────────────────────────── */}
      <Box x={40} y={272} w={400} h={90} kind="model" />
      <Title x={40} y={296} w={400} text="1 · Preflight" note="GeminiLiveSessionWrapper" />
      <Lines
        x={56}
        y={318}
        lines={[
          'Opens a Gemini Live session and waits for setup,',
          'so a bad key or model fails this row with an',
          'error before the phone ever rings.',
        ]}
      />
      <Arrow id={ID} x1={440} y1={318} x2={801} y2={318} />
      <text x={620} y={310} textAnchor="middle" className="small">setup, then close</text>

      <Arrow id={ID} x1={240} y1={362} x2={240} y2={397} />
      <text x={250} y={384} className="small">ready</text>

      {/* ── 2 · Dial ────────────────────────────────────────────── */}
      <Box x={40} y={398} w={400} h={90} />
      <Title x={40} y={422} w={400} text="2 · Dial" note="createTwilioCall()" />
      <Lines
        x={56}
        y={444}
        lines={[
          "Places the call through the provider's REST API.",
          'The answer and status URLs carry an HMAC of',
          'the call id. The row becomes QUEUED.',
        ]}
      />
      <Arrow id={ID} x1={440} y1={430} x2={499} y2={430} />
      <text x={470} y={422} textAnchor="middle" className="small">REST</text>

      {/* Phone provider */}
      <Box x={500} y={398} w={240} h={232} kind="provider" />
      <text x={516} y={422} className="title">Twilio or Plivo</text>
      <Lines
        x={516}
        y={446}
        className="body-s"
        lines={['Rings the contact. On answer,', 'calls the signed webhook, then', 'opens a media socket to the', 'backend.']}
      />
      <text x={516} y={534} className="mono">μ-law 8 kHz both ways</text>
      <line x1={516} y1={552} x2={724} y2={552} className="rule" />
      <Lines
        x={516}
        y={576}
        className="small"
        lines={['Status and recording callbacks', 'update the same CallHistory row']}
      />

      <Arrow id={ID} x1={240} y1={488} x2={240} y2={523} />
      <text x={250} y={510} className="small">contact answers</text>

      {/* ── 3 · Answer webhook ──────────────────────────────────── */}
      <Box x={40} y={524} w={400} h={96} />
      <Title x={40} y={548} w={400} text="3 · Answer webhook" note="handleTwilioAnswer()" />
      <Lines
        x={56}
        y={570}
        lines={['Marks the row IN_PROGRESS and returns', '<Connect><Stream> pointing at the socket:']}
      />
      <text x={56} y={606} className="mono">/twilio/stream?callId=…&amp;token=…</text>
      <Arrow id={ID} x1={499} y1={572} x2={441} y2={572} kind="hook" />
      <text x={470} y={564} textAnchor="middle" className="small">answer</text>

      <Arrow id={ID} x1={240} y1={620} x2={240} y2={659} />
      <text x={250} y={644} className="small">provider opens the socket</text>

      {/* ── 4 · Live call ───────────────────────────────────────── */}
      <Box x={40} y={660} w={400} h={262} />
      <Title x={40} y={684} w={400} text="4 · Live call" note="RealtimeCallingGateway" />
      <Lines
        x={56}
        y={706}
        lines={[
          'Checks the token, connects Gemini as soon as the',
          'socket opens and asks for the greeting, holding',
          'its audio until the stream starts.',
        ]}
      />
      <line x1={56} y1={756} x2={424} y2={756} className="rule" />
      <text x={56} y={778} className="mono">in   μ-law 8 kHz → PCM16 16 kHz → Gemini</text>
      <text x={56} y={796} className="mono">out  Gemini PCM16 24 kHz → μ-law 8 kHz</text>
      <Lines
        x={56}
        y={814}
        lines={['An adaptive noise gate decides when the caller', 'spoke; barge-in clears queued playback.']}
      />
      <line x1={56} y1={848} x2={424} y2={848} className="rule" />
      <Lines
        x={56}
        y={870}
        lines={[
          'Hangs up at 10 min, after two silent 15 s checks,',
          'or past the token budget. Reconnects once with a',
          'resumption handle if the Gemini socket drops.',
        ]}
      />

      {/* Phone audio into the gateway */}
      <PathArrow id={ID} d="M530,630 V690 H441" kind="live" both />
      <text x={538} y={662} className="small">media socket</text>

      {/* Tools the gateway runs for Gemini */}
      <Box x={500} y={712} w={240} h={70} kind="tool" />
      <text x={516} y={736} className="mono tool-name">end_call</text>
      <Lines x={516} y={757} step={17} className="body-s" lines={['Hangs up after a closing line,', 'only once the contact has spoken']} />
      <Arrow id={ID} x1={440} y1={747} x2={499} y2={747} both />

      <Box x={500} y={818} w={240} h={70} kind="tool" />
      <text x={516} y={842} className="mono tool-name">fetch_context</text>
      <Lines x={516} y={863} step={17} className="body-s" lines={["Searches the bot's knowledge;", 'gives up after 2.5 s']} />
      <Arrow id={ID} x1={440} y1={853} x2={499} y2={853} both />

      <Arrow id={ID} x1={620} y1={888} x2={620} y2={931} />
      <Box x={500} y={932} w={240} h={76} kind="store" />
      <text x={516} y={956} className="title">Bot knowledge</text>
      <text x={516} y={976} className="mono">AiCallingBotEmbedding</text>
      <text x={516} y={994} className="body-s">384-dim hashed vectors, top 5</text>

      {/* Gateway ↔ Gemini call session, between the two tools */}
      <Arrow id={ID} x1={440} y1={800} x2={801} y2={800} kind="live" both />
      <text x={765} y={792} textAnchor="middle" className="small">audio</text>

      {/* ── Gemini Live ─────────────────────────────────────────── */}
      <Group x={790} y={258} w={240} h={592} label="GEMINI LIVE" />
      <Box x={802} y={286} w={216} h={72} kind="model" />
      <text x={818} y={308} className="title">Preflight session</text>
      <Lines x={818} y={328} step={17} className="body-s" lines={['Connects, waits for setup,', 'then closes']} />

      <text x={804} y={400} className="small">Model, set per campaign:</text>
      <text x={804} y={420} className="mono">gemini-3.1-flash-live-preview</text>
      <text x={804} y={436} className="small">(default)</text>
      <text x={804} y={460} className="mono">gemini-2.5-flash-native-</text>
      <text x={804} y={476} className="mono">audio-preview-12-2025</text>
      <Lines x={804} y={512} step={16} className="small" lines={['API key from Settings,', 'else GEMINI_API_KEY']} />

      <Box x={802} y={756} w={216} h={84} kind="model" />
      <text x={818} y={778} className="title">Call session</text>
      <Lines
        x={818}
        y={797}
        step={16}
        className="body-s"
        lines={['Native audio both ways,', 'tool calls, transcripts,', 'session resumption']}
      />

      <Arrow id={ID} x1={240} y1={922} x2={240} y2={961} />
      <text x={250} y={946} className="small">socket closes</text>

      {/* ── 5 · Complete ────────────────────────────────────────── */}
      <Box x={40} y={962} w={400} h={72} />
      <Title x={40} y={986} w={400} text="5 · Complete" note="completeCall()" />
      <Lines
        x={56}
        y={1008}
        lines={['Writes COMPLETED and the transcript. The campaign', 'completes once no call is pending or live.']}
      />

      <Arrow id={ID} x1={240} y1={1034} x2={240} y2={1073} />

      <Box x={40} y={1074} w={400} h={78} kind="store" />
      <Title x={40} y={1096} w={400} text="CallHistory" note="one row per contact" />
      <Lines
        x={56}
        y={1118}
        lines={['Status, transcript and recording for each call;', 'History and the dashboard read it from here.']}
      />
    </svg>
  );
}
