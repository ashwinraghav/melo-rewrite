import type { Metadata } from 'next'
import { CURRENT_TERMS_VERSION } from '@mello/types'

export const metadata: Metadata = {
  title: 'Privacy Policy — Melo',
  description: 'Melo Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="mb-2 font-body text-xs text-on-surface-variant">
        Version {CURRENT_TERMS_VERSION} — Effective March 27, 2026
      </p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-on-surface">
        Privacy Policy
      </h1>

      <div className="space-y-8 font-body text-sm leading-relaxed text-on-surface-variant">
        <p>
          Melo provides a web-based platform that delivers audio stories for young children. This
          Privacy Policy describes how we collect, use, disclose, and protect your information when
          you use our Service.
        </p>
        <p>
          <strong className="text-on-surface">Melo is designed for adults.</strong> The Service is
          intended for use by parents and legal guardians (age 18 or older) who share content with
          their children under direct supervision. We do not knowingly collect personal information
          directly from children.
        </p>

        <Section title="1. Information We Collect">
          <H3>1.1 Information You Provide</H3>
          <ul>
            <li><strong className="text-on-surface">Account information:</strong> Email address and display name from your sign-in provider (Google, Facebook, or email/password)</li>
            <li><strong className="text-on-surface">Child profile information:</strong> Your child&apos;s age (1–12) and preferred story topics, as provided by you during setup. We do not collect any information directly from your child.</li>
            <li><strong className="text-on-surface">Creator content:</strong> Text prompts you submit for story generation</li>
            <li><strong className="text-on-surface">Voice recordings:</strong> Audio samples submitted by individuals you invite through the voice cloning feature (see Section 5)</li>
          </ul>

          <H3>1.2 Information Collected Automatically</H3>
          <ul>
            <li><strong className="text-on-surface">Usage data:</strong> Listening history, playback progress, favorites, search queries, and activity timestamps</li>
            <li><strong className="text-on-surface">Device and browser information:</strong> Browser type, operating system, device type, session data, and performance metrics (collected via our error monitoring service)</li>
            <li><strong className="text-on-surface">Authentication tokens:</strong> Session tokens managed by Firebase Authentication, stored locally on your device</li>
          </ul>

          <H3>1.3 Information We Do NOT Collect</H3>
          <ul>
            <li>Personal information directly from children</li>
            <li>Location data or GPS coordinates</li>
            <li>Device contacts, camera, or photo library access</li>
            <li>Tracking cookies for advertising</li>
            <li>Financial or payment information (the Service is currently free)</li>
            <li>Audio from your device microphone during playback (voice recording requires explicit initiation by an invited adult)</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul>
            <li><strong className="text-on-surface">To provide the Service:</strong> Authentication, personalized recommendations, listening history, story creation, and voice cloning</li>
            <li><strong className="text-on-surface">To improve the Service:</strong> Analyzing aggregated, de-identified usage patterns</li>
            <li><strong className="text-on-surface">To ensure safety and security:</strong> Monitoring for unauthorized access and detecting abuse</li>
            <li><strong className="text-on-surface">To communicate with you:</strong> Service-related notices and material changes to our policies</li>
          </ul>
        </Section>

        <Section title="3. How We Share Your Information">
          <p>
            We do not sell, rent, or trade your personal information. We share data only with
            service providers necessary to operate the Service:
          </p>
          <ul>
            <li><strong className="text-on-surface">Google Cloud Platform:</strong> Database, file storage, compute, and AI services</li>
            <li><strong className="text-on-surface">Firebase (Google):</strong> Authentication and session management</li>
            <li><strong className="text-on-surface">ElevenLabs:</strong> Voice cloning and text-to-speech</li>
            <li><strong className="text-on-surface">Anthropic:</strong> Story text generation (Claude API)</li>
            <li><strong className="text-on-surface">Google Vertex AI:</strong> Cover artwork and text embeddings</li>
            <li><strong className="text-on-surface">Cohere:</strong> Search result reranking</li>
            <li><strong className="text-on-surface">Sentry:</strong> Error monitoring and performance tracking</li>
          </ul>
          <p>
            We may also disclose information when required by law or to protect our rights and the
            safety of others.
          </p>
        </Section>

        <Section title="4. Children's Privacy">
          <p>
            Melo is not directed to children under 13 within the meaning of the Children&apos;s
            Online Privacy Protection Act (&quot;COPPA&quot;). We do not knowingly collect personal
            information from children under 13. All account creation and data input is performed by
            the parent or guardian.
          </p>
          <p>
            Child age and topic preferences are associated with the parent&apos;s adult account, not
            a child account. No child account exists. We do not assign persistent identifiers to
            children or track children across services.
          </p>
          <p>
            If we learn that we have inadvertently collected personal information from a child under
            13 without verifiable parental consent, we will delete it promptly. Contact us at{' '}
            <a href="mailto:legal@melostories.com" className="text-primary underline underline-offset-2">
              legal@melostories.com
            </a>{' '}
            if you believe this has occurred.
          </p>
        </Section>

        <Section title="5. Voice Data and Biometric Information">
          <H3>5.1 What We Collect</H3>
          <p>
            When you use voice cloning, an invited individual records a voice sample (at least 30
            seconds). This recording is stored on our servers and transmitted to ElevenLabs for
            voice cloning.
          </p>

          <H3>5.2 How Voice Data Is Used</H3>
          <p>
            Voice data is used exclusively for creating a synthetic voice clone and narrating stories
            within Melo. It is not used for identification, advertising, sale to third parties, or
            training general-purpose AI models.
          </p>

          <H3>5.3 Biometric Data Notice</H3>
          <p>
            In jurisdictions where voice recordings are classified as biometric data (including
            Illinois, Texas, and Washington): voice samples are collected for the sole purpose of
            story narration, retained while the voice is active on your account, and transmitted to
            ElevenLabs for processing. Your use of this feature constitutes informed, written
            consent. You are responsible for obtaining consent from invited voice providers.
          </p>

          <H3>5.4 Voice Data Deletion</H3>
          <p>
            You may delete a cloned voice at any time. We will remove the recording and associated
            data from our servers and request deletion from ElevenLabs. Converted story audio files
            using that voice will also be deleted.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p>
            We implement commercially reasonable measures to protect your information: all data is
            encrypted in transit (TLS/HTTPS) and at rest (Google-managed encryption). API access
            requires a valid Firebase authentication token verified server-side. However, no method
            of transmission or storage is 100% secure.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <ul>
            <li><strong className="text-on-surface">Account data:</strong> Retained while your account is active</li>
            <li><strong className="text-on-surface">Usage data:</strong> Retained for the lifetime of your account</li>
            <li><strong className="text-on-surface">Voice data:</strong> Retained until you delete the voice or your account</li>
          </ul>
          <p>
            Upon account deletion, we will delete or anonymize your personal data within 30 days,
            except where retention is required by law.
          </p>
        </Section>

        <Section title="8. Your Rights">
          <ul>
            <li><strong className="text-on-surface">Access:</strong> Request a copy of your personal information</li>
            <li><strong className="text-on-surface">Correction:</strong> Update your profile through the Service</li>
            <li><strong className="text-on-surface">Deletion:</strong> Request account and data deletion</li>
            <li><strong className="text-on-surface">Voice deletion:</strong> Delete individual voices without deleting your account</li>
          </ul>

          <H3>California Residents (CCPA/CPRA)</H3>
          <p>
            You have the right to know what personal information we collect, delete your personal
            information, and opt out of the sale of personal information (we do not sell personal
            information). Contact us at{' '}
            <a href="mailto:legal@melostories.com" className="text-primary underline underline-offset-2">
              legal@melostories.com
            </a>
            .
          </p>

          <H3>EEA, UK, and Switzerland (GDPR)</H3>
          <p>
            You have the right to access, correct, delete, restrict, or port your personal data, and
            to withdraw consent at any time. Our legal bases for processing are: contract
            performance, consent (for voice data), and legitimate interests (for service improvement
            and security).
          </p>
        </Section>

        <Section title="9. International Data Transfers">
          <p>
            Melo is operated from the United States. If you access the Service from outside the
            US, your information will be transferred to and processed in the United States. By using
            the Service, you consent to this transfer.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Material changes affecting data
            collection, children&apos;s privacy, or voice data handling will require your affirmative
            re-consent.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            If you have questions, contact us at{' '}
            <a href="mailto:legal@melostories.com" className="text-primary underline underline-offset-2">
              legal@melostories.com
            </a>
          </p>
          <p>
            <strong className="text-on-surface">Melo</strong><br />
            Website: melostories.com
          </p>
        </Section>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-on-surface">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-4 mb-2 font-display text-base font-medium text-on-surface">{children}</h3>
}
