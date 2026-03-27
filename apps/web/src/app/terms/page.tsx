import type { Metadata } from 'next'
import { CURRENT_TERMS_VERSION } from '@mello/types'

export const metadata: Metadata = {
  title: 'Terms of Service — Mello',
  description: 'Mello Terms of Service',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="mb-2 font-body text-xs text-on-surface-variant">
        Version {CURRENT_TERMS_VERSION} — Effective March 27, 2026
      </p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-on-surface">
        Terms of Service
      </h1>

      <div className="prose-legal space-y-8 font-body text-sm leading-relaxed text-on-surface-variant">
        <p>
          Welcome to Mello. Mello is a web-based platform that delivers audio stories for young
          children. The Service is designed for use by adults — specifically parents and legal
          guardians — who may choose to share Mello content with their children under direct
          supervision.
        </p>
        <p>
          By creating an account or using Mello in any way, you agree to these Terms of Service.
          If you do not agree, do not use the Service.
        </p>

        <Section title="1. Eligibility and Account Registration">
          <H3>1.1 Age Requirement</H3>
          <p>
            You must be at least eighteen (18) years of age, or the age of legal majority in your
            jurisdiction (whichever is greater), to create a Mello account and use the Service.
            Mello is not directed to children. Children may not create accounts, and no feature of
            the Service is designed for unassisted use by a child.
          </p>

          <H3>1.2 Parental and Guardian Responsibility</H3>
          <p>By using Mello, you represent and warrant that:</p>
          <ul>
            <li>You are the parent or legal guardian of any child to whom you make Mello content available;</li>
            <li>You will directly supervise your child&apos;s interaction with Mello content at all times;</li>
            <li>You accept full responsibility for your child&apos;s experience with any content accessed through your account;</li>
            <li>You will review content before or during your child&apos;s listening session and will discontinue use of any content you deem inappropriate;</li>
            <li>You understand that Mello content is generated with the assistance of artificial intelligence and that no automated system can guarantee content will be appropriate for every child at every age.</li>
          </ul>

          <H3>1.3 Account Security</H3>
          <p>
            You are solely responsible for maintaining the confidentiality of your account
            credentials and for all activity that occurs under your account.
          </p>
        </Section>

        <Section title="2. Description of the Service">
          <p>Mello provides:</p>
          <ul>
            <li>A curated and AI-generated catalog of audio stories for young children</li>
            <li>Personalized story recommendations based on parent-provided child age and topic preferences</li>
            <li>Listening history and favorites tracking</li>
            <li>A creator tool that allows parents to generate custom stories using artificial intelligence</li>
            <li>A voice cloning feature that allows designated individuals to record voice samples for story narration</li>
          </ul>
          <p>
            The Service is currently provided free of charge. We reserve the right to introduce paid
            features or subscriptions in the future, with advance notice and updated Terms.
          </p>
        </Section>

        <Section title="3. AI-Generated Content">
          <H3>3.1 Nature of Content</H3>
          <p>
            Stories available on Mello — including text, audio narration, and cover artwork — may be
            generated in whole or in part using artificial intelligence technologies, including large
            language models, text-to-speech synthesis, and image generation models.
          </p>

          <H3>3.2 No Guarantee of Appropriateness</H3>
          <p>You acknowledge and agree that:</p>
          <ul>
            <li>AI-generated content is produced by probabilistic models that may occasionally generate unexpected, inaccurate, or inappropriate output, despite our content safety measures;</li>
            <li>Mello does not and cannot guarantee that any content will be suitable, safe, or appropriate for your child or for children of any particular age;</li>
            <li>Age ranges and topic classifications are approximate guidance, not guarantees of suitability;</li>
            <li>It is your sole responsibility as a parent or guardian to evaluate and approve all content before or during your child&apos;s consumption;</li>
            <li>You will not rely exclusively on Mello&apos;s content filtering or age classifications as a substitute for your own parental judgment.</li>
          </ul>

          <H3>3.3 AI Disclosure</H3>
          <p>
            Stories on Mello may be generated or assisted by: large language models for story text,
            neural text-to-speech for audio narration, and diffusion models for cover artwork. We do
            not represent AI-generated content as human-created.
          </p>
        </Section>

        <Section title="4. Voice Cloning Feature">
          <H3>4.1 Consent to Voice Recording</H3>
          <p>By using the voice cloning feature, you represent and warrant that:</p>
          <ul>
            <li>You have obtained the informed, voluntary consent of any individual whose voice is recorded;</li>
            <li>The individual recording is at least eighteen (18) years of age;</li>
            <li>No voice sample will be recorded from a child under the age of thirteen (13);</li>
            <li>You will not use voice cloning to impersonate any individual without their explicit consent.</li>
          </ul>

          <H3>4.2 Voice Data Processing</H3>
          <p>
            Voice samples are transmitted to and processed by our third-party voice synthesis
            provider for creating a synthetic voice clone. They are stored on our servers and our
            provider&apos;s servers for as long as the voice remains active on your account, and used
            solely for narrating stories within Mello.
          </p>

          <H3>4.3 Biometric Data Notice</H3>
          <p>
            In certain jurisdictions (including Illinois, Texas, and Washington), voice recordings
            and voiceprints may be classified as biometric data subject to additional legal
            protections. By using the voice cloning feature, you acknowledge that voice samples are
            collected, transmitted to a third-party processor, and used to generate a synthetic
            voiceprint. Your use of this feature constitutes your informed, written consent to this
            processing.
          </p>
        </Section>

        <Section title="5. User-Created Content">
          <p>
            The creator tool allows you to submit prompts used to generate stories via AI. You
            retain ownership of your original prompts. By generating a story, you grant Mello a
            worldwide, non-exclusive, royalty-free license to use the generated content for
            operating, improving, and promoting the Service.
          </p>
          <p>
            You agree not to use the Service to generate content that is sexually explicit, promotes
            violence or hatred, infringes intellectual property rights, or violates any applicable
            law. We reserve the right to remove violating content and suspend or terminate accounts.
          </p>
        </Section>

        <Section title="6. Data Collection and Privacy">
          <p>
            Our collection and use of your data is governed by our{' '}
            <a href="/privacy" className="text-primary underline underline-offset-2">
              Privacy Policy
            </a>
            , which is incorporated by reference into these Terms.
          </p>

          <H3>6.1 Children&apos;s Privacy</H3>
          <p>
            Mello is not a service directed to children under 13 within the meaning of the
            Children&apos;s Online Privacy Protection Act (&quot;COPPA&quot;). We do not knowingly
            collect personal information from children under 13. All account creation and data input
            is performed by the parent or guardian. If we learn that we have inadvertently collected
            personal information from a child under 13, we will delete it promptly.
          </p>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <p className="font-medium text-on-surface">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTY
            OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="font-medium text-on-surface">
            MELLO DOES NOT WARRANT THAT ANY CONTENT — INCLUDING AI-GENERATED CONTENT — WILL BE
            ACCURATE, COMPLETE, RELIABLE, SAFE, OR APPROPRIATE FOR ANY AUDIENCE. USE OF THE SERVICE,
            INCLUDING SHARING CONTENT WITH YOUR CHILD, IS AT YOUR SOLE RISK.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p className="font-medium text-on-surface">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MELLO SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE
            SERVICE, INCLUDING DAMAGES RELATED TO CONTENT CONSUMED BY YOUR CHILD, VOICE DATA, OR
            UNAUTHORIZED ACCESS TO YOUR ACCOUNT.
          </p>
          <p className="font-medium text-on-surface">
            MELLO&apos;S TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF THE AMOUNT YOU PAID TO
            MELLO IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED U.S. DOLLARS ($100).
          </p>
        </Section>

        <Section title="9. Indemnification">
          <p>
            You agree to indemnify and hold harmless Mello and its officers, directors, employees,
            and affiliates from any claims, damages, or expenses arising from your use of the
            Service, violation of these Terms, content you create, your use of the voice cloning
            feature, or any claim by or on behalf of your child related to content accessed through
            your account.
          </p>
        </Section>

        <Section title="10. Dispute Resolution">
          <p className="font-medium text-on-surface">
            YOU AND MELLO AGREE THAT ANY DISPUTE ARISING FROM THESE TERMS OR THE SERVICE SHALL BE
            RESOLVED THROUGH BINDING INDIVIDUAL ARBITRATION, NOT IN COURT. EACH PARTY MAY BRING
            CLAIMS ONLY IN THEIR INDIVIDUAL CAPACITY, NOT AS PART OF A CLASS OR REPRESENTATIVE
            ACTION.
          </p>
          <p>
            Arbitration shall be administered by the American Arbitration Association under its
            Consumer Arbitration Rules. Either party may bring an individual action in small claims
            court as an alternative. These Terms are governed by the laws of the State of Delaware.
          </p>
        </Section>

        <Section title="11. Changes to Terms">
          <p>
            We may update these Terms from time to time. For material changes affecting parental
            responsibilities, data practices, or content safety, we will require affirmative
            re-consent before you may continue using the Service. Your continued use after non-material
            updates constitutes acceptance.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            If you have questions about these Terms, please contact us at{' '}
            <a href="mailto:legal@melostories.com" className="text-primary underline underline-offset-2">
              legal@melostories.com
            </a>
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
