import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { pageMetadata } from '@/lib/seo';
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy policy — ReachConvert',
  description:
    'What personal data ReachConvert collects, how it is used, which providers process it, how cookies and ads work on this site, and how to exercise your privacy rights.',
  path: '/privacy',
});

const EFFECTIVE_DATE = '15 October 2026';

const linkClass = 'text-indigo-300 underline underline-offset-2 hover:text-indigo-200';

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          {SITE_NAME} is an AI calling and email outreach platform available at{' '}
          <Link href="/" className={linkClass}>{SITE_URL.replace('https://', '')}</Link>. This
          policy explains what personal data we collect when you visit the website or use the
          hosted service, how we use it, and the choices you have. You can reach us about anything
          in this policy at <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>{CONTACT_EMAIL}</a>.
        </p>
        <p className="mt-3">
          {SITE_NAME} is also open-source software. If you run your own copy, you operate it and
          this policy does not cover that installation.
        </p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p className="font-semibold text-zinc-200">Your account</p>
        <Bullets
          items={[
            'Your name, email address and password. Passwords are stored only as a one-way hash.',
            'If you sign in with Google, we receive your Google account ID, name and verified email address through Amazon Cognito. We do not receive your Google password.',
            'Account preferences such as theme, sender name and email signature.',
          ]}
        />
        <p className="mt-5 font-semibold text-zinc-200">Content you add to your workspace</p>
        <Bullets
          items={[
            'Contacts and prospects you import, add or find with Prospect Finder, such as names, job titles, companies, work email addresses, phone numbers and the public pages they came from.',
            'Email templates, campaigns, drafts, and the emails you send and receive through the inbox, including attachments.',
            'Calling agents, call logs, outcomes, transcripts and, for calls placed through Twilio, call recordings.',
            'Credentials for the providers you connect (such as AWS, Twilio, Plivo and Gemini). These are encrypted at rest with AES-256-GCM and never shown back in full.',
          ]}
        />
        <p className="mt-5 font-semibold text-zinc-200">Information collected automatically</p>
        <Bullets
          items={[
            'Technical data such as IP address, browser type, device, pages visited and the time of each request, kept in server logs and used for security and troubleshooting.',
            'Usage and analytics data collected through Google Analytics, and advertising data collected by Google AdSense on our public pages (see Cookies and advertising below).',
          ]}
        />
      </>
    ),
  },
  {
    id: 'recipients',
    title: 'People our customers contact',
    body: (
      <>
        <p>
          When a customer sends email or places calls with {SITE_NAME}, the customer decides who to
          contact and why. For that contact data we act as a service provider (a processor) on the
          customer’s behalf, and the customer is responsible for having a lawful basis to contact
          you. If you received an email or call and want to be removed, contact the sender
          directly or write to us and we will pass your request on.
        </p>
        <Bullets
          items={[
            'Emails sent through the platform may contain a small image that records when the message is opened, and links to unsubscribe from that sender.',
            'If you unsubscribe, your address is added to that sender’s suppression list so the platform does not email you from their account again.',
            'Replies you send are delivered to the sender’s inbox in the platform.',
            'Calls may be recorded and transcribed. The sender is responsible for telling you so where the law requires it.',
          ]}
        />
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use information',
    body: (
      <Bullets
        items={[
          'To provide the service: sign you in, store your workspace, send your emails, place your calls and show you results.',
          'To keep the service secure, prevent abuse and fraud, and enforce rate limits.',
          'To send service messages such as email verification, password resets and important account notices.',
          'To understand how the website is used and improve it.',
          'To show advertising on our public pages, which helps fund the project.',
          'To meet legal obligations and respond to lawful requests.',
        ]}
      />
    ),
  },
  {
    id: 'legal-bases',
    title: 'Legal bases',
    body: (
      <p>
        Where data protection law such as the GDPR applies, we rely on performance of our contract
        with you to run your account, our legitimate interests to secure and improve the service,
        your consent for non-essential cookies and personalised advertising where consent is
        required, and legal obligation where the law requires us to keep or disclose information.
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and advertising',
    body: (
      <>
        <p>We use the following cookies and similar technologies:</p>
        <Bullets
          items={[
            <><span className="font-semibold text-zinc-200">Essential:</span> secure, HttpOnly session cookies that keep you signed in, and a cookie that protects forms against cross-site request forgery. Your browser also stores your display preferences, and a short-lived value while you sign in with Google. The service does not work without these.</>,
            <><span className="font-semibold text-zinc-200">Analytics:</span> Google Analytics sets cookies to count visits and see which pages are used. Google’s handling of this data is described in <External href="https://policies.google.com/technologies/partner-sites">How Google uses information from sites that use its services</External>. You can opt out with the <External href="https://tools.google.com/dlpage/gaoptout">Google Analytics opt-out browser add-on</External>.</>,
            <><span className="font-semibold text-zinc-200">Advertising:</span> our public pages show ads served by Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites. Google’s advertising cookies let it and its partners serve ads to you based on those visits.</>,
          ]}
        />
        <p className="mt-4">
          You can opt out of personalised advertising in Google’s{' '}
          <External href="https://adssettings.google.com">Ads Settings</External>, and opt out of
          some third-party vendors’ use of cookies for personalised advertising at{' '}
          <External href="https://www.aboutads.info/choices/">aboutads.info</External>. Visitors
          in the European Economic Area, the UK and Switzerland are asked for consent before
          personalised ads are shown. You can also block or delete cookies in your browser
          settings.
        </p>
        <p className="mt-3">Ads are not shown inside the signed-in app.</p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share information with',
    body: (
      <>
        <p>
          We do not sell your personal data. We share it only with providers that help us run the
          service, under terms that require them to protect it:
        </p>
        <Bullets
          items={[
            'Amazon Web Services: hosting, file storage, sign-in (Cognito), secrets storage and email delivery (SES).',
            'MongoDB: the database that stores account and workspace data.',
            'Vercel: hosting for this website.',
            'Google: analytics, advertising, and AI features (Gemini) when you use them.',
            'Twilio and Plivo: placing calls, through the accounts you connect.',
          ]}
        />
        <p className="mt-4">
          We may also disclose information when required by law, to protect the rights and safety
          of our users or the public, or as part of a merger or sale of the service, in which case
          this policy will continue to apply to your data.
        </p>
      </>
    ),
  },
  {
    id: 'transfers',
    title: 'Where data is stored',
    body: (
      <p>
        The service is hosted on AWS in the Asia Pacific (Mumbai) region, and some providers,
        such as Google and Vercel, process data in other countries including the United States.
        Where data leaves your country, we rely on the safeguards those providers offer, such as
        standard contractual clauses.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <Bullets
        items={[
          'Account and workspace data is kept while your account is open. When you delete content, or ask us to close your account, we delete it from the live service, and it leaves our backups as they expire.',
          'People and companies found by Prospect Finder that you do not add to your contacts are deleted after 90 days.',
          'Suppression entries are kept so that people who unsubscribed are not emailed again.',
          'Server logs are kept for a limited time for security and troubleshooting.',
        ]}
      />
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Traffic is encrypted with HTTPS, passwords are hashed, provider credentials are encrypted
        at rest, sessions use HttpOnly cookies with CSRF protection, and each account can see only
        its own data. No system is perfectly secure, so please use a strong, unique password and
        tell us at once if you think your account has been compromised.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>
          Depending on where you live, including under the GDPR and India’s Digital Personal Data
          Protection Act, 2023, you may have the right to:
        </p>
        <Bullets
          items={[
            'access the personal data we hold about you and get a copy of it;',
            'correct inaccurate data or complete incomplete data;',
            'delete your data;',
            'object to or restrict some processing, and withdraw consent at any time;',
            'receive your data in a portable format; and',
            'complain to your local data protection authority.',
          ]}
        />
        <p className="mt-4">
          You can update most account details in your profile. For anything else, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>{CONTACT_EMAIL}</a>. We will
          reply within 30 days and may need to confirm your identity first.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        {SITE_NAME} is a business tool and is not intended for anyone under 18. We do not
        knowingly collect personal data from children. If you believe a child has given us
        personal data, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We may update this policy as the service changes. We will post the new version here with
        a new effective date, and tell account holders by email about significant changes.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions or requests about this policy:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>{CONTACT_EMAIL}</a>, or use
        the <Link href="/contact" className={linkClass}>contact page</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto w-full max-w-3xl text-center">
        <Reveal>
          <p className="sig-label text-indigo-400">[ PRIVACY POLICY ]</p>
          <h1 className="sig-display mt-4 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
            Your data, plainly
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
            What we collect, why, who processes it, and how to get it changed or deleted.
          </p>
          <p className="mx-auto mt-4 text-sm text-zinc-500">Effective {EFFECTIVE_DATE}</p>
        </Reveal>
      </section>

      {/* ---------------- Contents ---------------- */}
      <nav aria-label="Privacy policy sections" className="mx-auto mt-14 w-full max-w-3xl">
        <div className="sig-card p-6">
          <p className="sig-label text-zinc-300">Contents</p>
          <ol className="mt-4 grid list-decimal grid-cols-1 gap-x-8 gap-y-2 pl-5 text-sm text-zinc-400 marker:text-indigo-400 sm:grid-cols-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="transition-colors hover:text-indigo-300">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* ---------------- Sections ---------------- */}
      <div className="mx-auto mt-12 w-full max-w-3xl space-y-12">
        {SECTIONS.map((section, i) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="sig-display text-xl font-extrabold text-white sm:text-2xl">
              <span className="mr-2 text-indigo-400">{i + 1}.</span>
              {section.title}
            </h2>
            <div className="mt-4 text-sm leading-7 text-zinc-300 sm:text-base">{section.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
