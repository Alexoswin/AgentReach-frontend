import type { SEOFeaturePageData } from '@/components/SEOFeaturePage';

export const SEO_PAGES = {
  aiCalling: {
    path: '/ai-calling',
    eyebrow: 'AI CALLING SOFTWARE',
    title: 'AI calling software for automated outbound conversations',
    intro: 'ReachConvert lets sales teams launch AI voice campaigns that qualify leads, answer common questions, and route promising conversations to the next step.',
    description: 'Run calls, email, and campaign analytics from one open-source outreach workspace.',
    benefits: [
      { title: 'Natural AI voice conversations', text: 'Configure a voice agent with a clear persona, greeting, script, and objection handling.' },
      { title: 'Campaign-level control', text: 'Choose contacts, schedule calls, set retries, and review outcomes without losing campaign context.' },
      { title: 'Transcripts and outcomes', text: 'Keep call history, transcripts, recordings, and outcomes together for follow-up.' },
    ],
    steps: [
      { title: 'Connect your calling provider', text: 'Use your own Twilio or Plivo account and configure the voice model connection.' },
      { title: 'Create an AI calling campaign', text: 'Select contacts, choose a calling agent, and add the objective your agent should complete.' },
      { title: 'Review and follow up', text: 'Use outcomes and transcripts to identify qualified conversations and trigger the next action.' },
    ],
    useCases: ['Lead qualification', 'Appointment setting', 'Event follow-up', 'Reactivation campaigns', 'Customer research', 'Outbound lead follow-up'],
    faqs: [
      { question: 'What is AI calling software?', answer: 'AI calling software uses a voice agent to place outbound phone calls, hold conversations, and record outcomes according to a configured workflow.' },
      { question: 'Can I use my own telephony account?', answer: 'Yes. ReachConvert is designed to connect your own Twilio or Plivo credentials, so provider usage is billed directly to your account.' },
      { question: 'Is AI calling compliant everywhere?', answer: 'No. Consent, disclosure, recording, calling hours, and do-not-call requirements vary by location. Review the compliance guide before launching calls.' },
    ],
    related: [{ label: 'Calling agents', href: '/calling-agents' }, { label: 'Calling automation', href: '/calling-automation' }, { label: 'Compliance guide', href: '/compliance' }],
  },
  callingAgents: {
    path: '/calling-agents',
    eyebrow: 'AI CALLING AGENTS',
    title: 'AI calling agents for sales and lead qualification',
    intro: 'Create configurable AI calling agents with their own voice, instructions, knowledge, and objection-handling rules for repeatable outbound conversations.',
    description: 'Give every campaign a consistent conversational playbook while keeping a human team in control.',
    benefits: [
      { title: 'Configurable personas', text: 'Define how an agent introduces itself, asks questions, handles objections, and ends a call.' },
      { title: 'Knowledge-grounded answers', text: 'Add product or company context so an agent can answer common questions more consistently.' },
      { title: 'Human-ready handoff', text: 'Use call outcomes and transcripts to decide when a representative should follow up.' },
    ],
    steps: [
      { title: 'Define the agent objective', text: 'Start with one measurable goal such as qualification, booking, confirmation, or research.' },
      { title: 'Write the conversation rules', text: 'Add an opening, qualification questions, approved answers, and boundaries for the agent.' },
      { title: 'Test before launch', text: 'Preview the voice and review sample conversations before connecting an agent to a live campaign.' },
    ],
    useCases: ['B2B prospecting', 'Lead scoring', 'Demo booking', 'Renewal reminders', 'Survey calls', 'Recruiting outreach'],
    faqs: [
      { question: 'What can an AI calling agent do?', answer: 'It can follow a defined conversation, ask qualification questions, provide approved information, capture outcomes, and hand follow-up work to a human.' },
      { question: 'Can I create more than one agent?', answer: 'Yes. Create different agents for products, audiences, languages, or campaign objectives.' },
      { question: 'How do I make calls safer?', answer: 'Use clear identity and AI disclosure, respect consent and opt-outs, follow local calling-hour rules, and review the compliance requirements for every market.' },
    ],
    related: [{ label: 'AI calling software', href: '/ai-calling' }, { label: 'Email automation', href: '/email-automation' }, { label: 'AI calling docs', href: '/documentation/automate-cold-calls-with-ai' }],
  },
  callingAutomation: {
    path: '/calling-automation',
    eyebrow: 'CALLING AUTOMATION',
    title: 'Calling automation software for outbound sales workflows',
    intro: 'Automate the operational work around outbound calls: contact selection, scheduling, campaign launch, call tracking, and follow-up review.',
    description: 'Turn a contact list and calling playbook into a repeatable, measurable sales workflow.',
    benefits: [
      { title: 'Schedule campaigns', text: 'Plan campaigns ahead of time and let the scheduler launch them when your team is ready.' },
      { title: 'Share contact context', text: 'Use the same contact directory across calling, email, segments, and analytics.' },
      { title: 'Connect signals to action', text: 'Use buying signals and playbooks to identify when an account may need timely outreach.' },
    ],
    steps: [
      { title: 'Import and segment contacts', text: 'Bring in contacts, map fields, and create the audience for an automated calling workflow.' },
      { title: 'Set the campaign rules', text: 'Choose the agent, timing, retries, and objective for the calls.' },
      { title: 'Measure the workflow', text: 'Review call status, outcomes, transcripts, and the next action from the campaign history.' },
    ],
    useCases: ['Outbound prospecting', 'Signal-triggered calls', 'Lead follow-up', 'Account reactivation', 'Multi-step outreach', 'Sales operations testing'],
    faqs: [
      { question: 'What does calling automation include?', answer: 'Calling automation can include contact selection, campaign scheduling, outbound dialing, agent instructions, call logging, and follow-up reporting.' },
      { question: 'Can calling automation work with email?', answer: 'Yes. ReachConvert shares contacts and analytics across email campaigns and AI calling campaigns so teams can coordinate both channels.' },
      { question: 'Does automation remove the need for compliance review?', answer: 'No. You remain responsible for consent, disclosures, opt-outs, calling hours, recording rules, and local regulations.' },
    ],
    related: [{ label: 'AI calling', href: '/ai-calling' }, { label: 'Outreach automation', href: '/outreach-automation' }, { label: 'Compliance guide', href: '/compliance' }],
  },
  emailAutomation: {
    path: '/email-automation',
    eyebrow: 'EMAIL AUTOMATION',
    title: 'Email automation for personalized sales outreach',
    intro: 'Create personalized sales email campaigns with merge fields, AI-assisted templates, contact segments, scheduling, and delivery analytics.',
    description: 'Automate repetitive email work without giving up control over the message your prospects receive.',
    benefits: [
      { title: 'Personalized at scale', text: 'Use contact fields and AI-written variables to create relevant messages for each recipient.' },
      { title: 'Provider-owned delivery', text: 'Send through your own Amazon SES account and keep provider billing and credentials under your control.' },
      { title: 'Actionable analytics', text: 'Track delivery, opens, replies, and campaign performance in the same workspace as calls.' },
    ],
    steps: [
      { title: 'Import your contacts', text: 'Upload or create contacts, map their fields, and organize them into useful segments.' },
      { title: 'Create the campaign', text: 'Write or generate a template, add personalization, and select the campaign audience.' },
      { title: 'Schedule and review', text: 'Launch or schedule the campaign, then use delivery and reply outcomes to improve the next message.' },
    ],
    useCases: ['Personalized cold email', 'Lead nurturing', 'Event invitations', 'Founder-led sales', 'Partner outreach', 'Signal-based follow-up'],
    faqs: [
      { question: 'What is email automation?', answer: 'Email automation uses software to personalize, schedule, send, and measure email campaigns based on contacts, segments, or workflow triggers.' },
      { question: 'Can I use my own email provider?', answer: 'Yes. ReachConvert sends through your own Amazon SES setup, giving you control over provider credentials and usage costs.' },
      { question: 'Does ReachConvert automatically manage opt-outs?', answer: 'You are responsible for adding opt-out language, honoring requests, and following the rules that apply to your recipients. Review the compliance guide before sending.' },
    ],
    related: [{ label: 'AI calling', href: '/ai-calling' }, { label: 'Outreach automation', href: '/outreach-automation' }, { label: 'Email docs', href: '/documentation/email-campaigns' }],
  },
  outreachAutomation: {
    path: '/outreach-automation',
    eyebrow: 'OUTREACH AUTOMATION',
    title: 'AI outreach automation across email and phone',
    intro: 'Coordinate personalized email, AI calling agents, contact segments, buying signals, and analytics in one open-source outreach platform.',
    description: 'Replace disconnected outreach tools with one workflow for finding, contacting, and following up with prospects.',
    benefits: [
      { title: 'One contact workspace', text: 'Keep contact records and segments available to both email and calling campaigns.' },
      { title: 'Signals trigger playbooks', text: 'Watch hiring, news, filings, and other signals, then review or trigger outreach workflows.' },
      { title: 'Open-source and self-hostable', text: 'Run the platform on your own infrastructure or use the hosted version while connecting your own providers.' },
    ],
    steps: [
      { title: 'Bring your audience together', text: 'Import contacts and organize them by company, role, intent, or campaign.' },
      { title: 'Choose the right channel', text: 'Pair personalized email with an AI calling agent and use signals to prioritize timing.' },
      { title: 'Learn from every outcome', text: 'Use replies, call outcomes, and analytics to refine your outreach playbooks.' },
    ],
    useCases: ['Multichannel prospecting', 'Account-based outreach', 'Signal-based campaigns', 'Founder-led growth', 'Sales development', 'Open-source RevOps'],
    faqs: [
      { question: 'What is outreach automation?', answer: 'Outreach automation coordinates prospect research, segmentation, personalized messages, calls, scheduling, and follow-up reporting across a sales workflow.' },
      { question: 'Why combine email and calling?', answer: 'Different prospects respond to different channels. Combining them gives teams more context and a way to coordinate follow-up without copying data between tools.' },
      { question: 'Is ReachConvert open source?', answer: 'Yes. ReachConvert is available under the AGPL-3.0 license and can be self-hosted. Provider costs for email, telephony, and AI are separate.' },
    ],
    related: [{ label: 'AI calling', href: '/ai-calling' }, { label: 'Email automation', href: '/email-automation' }, { label: 'Compare outreach tools', href: '/compare' }],
  },
} satisfies Record<string, SEOFeaturePageData>;
