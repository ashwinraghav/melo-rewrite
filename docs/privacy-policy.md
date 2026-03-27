# Mello — Privacy Policy

**Effective Date:** [DATE]
**Last Updated:** [DATE]

Mello ("Mello," "we," "us," or "our") provides a web-based platform that delivers audio stories for young children. This Privacy Policy describes how we collect, use, disclose, and protect your information when you use our Service.

**Mello is designed for adults.** The Service is intended for use by parents and legal guardians (age 18 or older) who share content with their children under direct supervision. We do not knowingly collect personal information directly from children.

By using the Service, you consent to the practices described in this Privacy Policy.

---

## 1. Information We Collect

### 1.1 Information You Provide

**(a) Account Information.** When you create a Mello account, we collect:
- Email address (from your Google, Facebook, or email/password sign-in)
- Display name (if provided by your authentication provider or entered manually)

**(b) Child Profile Information.** During onboarding, you may provide:
- Your child's age (1–12)
- Preferred story topics (e.g., "animals," "nature," "space")

**This information is provided by you, the parent or guardian — never by your child.** We use it solely to personalize story recommendations.

**(c) Creator Content.** If you use the story creation feature, we collect the text prompts you submit for story generation.

**(d) Voice Recordings.** If you use the voice cloning feature, we collect audio recordings submitted by individuals you invite (e.g., a family member). See Section 5 for details on voice data handling.

### 1.2 Information Collected Automatically

**(a) Usage Data.** When you use the Service, we automatically collect:
- Listening history (which stories were played, playback progress, completion status)
- Stories you mark as favorites
- Search queries
- Timestamps of activity

**(b) Device and Browser Information.** Our error monitoring service (Sentry) collects:
- Browser type and version
- Operating system
- Device type
- Session data and performance metrics
- Client-side error reports

**(c) Authentication Tokens.** Firebase Authentication manages session tokens stored locally on your device (in IndexedDB or browser local storage). These tokens are used to authenticate your API requests and are not accessible to Mello's servers beyond token verification.

### 1.3 Information We Do NOT Collect

We want to be explicit about what we do not collect:

- We do **not** collect personal information directly from children
- We do **not** collect location data, GPS coordinates, or geolocation information
- We do **not** access your device's contacts, camera, or photo library
- We do **not** use tracking cookies for advertising purposes
- We do **not** collect financial or payment information (the Service is currently free)
- We do **not** record audio from your device's microphone during story playback (the voice recording feature requires explicit user initiation by an invited adult)

---

## 2. How We Use Your Information

We use the information we collect for the following purposes:

**(a) To provide and operate the Service** — authenticating your identity, delivering personalized story recommendations, tracking your listening history and favorites, and enabling story creation and voice cloning features.

**(b) To improve the Service** — analyzing usage patterns to improve story recommendations, content quality, and user experience. We may use aggregated, de-identified data for analytics.

**(c) To ensure safety and security** — monitoring for unauthorized access, detecting abuse or violations of our Terms of Service, and diagnosing technical errors.

**(d) To communicate with you** — sending service-related notices, responding to inquiries, and notifying you of material changes to our Terms of Service or Privacy Policy.

---

## 3. How We Share Your Information

We do not sell, rent, or trade your personal information to third parties for their marketing purposes. We share your information only in the following circumstances:

### 3.1 Third-Party Service Providers

We use the following categories of service providers to operate the Service. Your data is shared with them solely for the purpose of providing the Service:

| Provider Category | Provider | Data Shared | Purpose |
|---|---|---|---|
| Cloud Infrastructure | Google Cloud Platform | All service data | Database (Firestore), file storage (Cloud Storage), compute (Cloud Run), AI services (Vertex AI) |
| Authentication | Firebase (Google) | Email, display name, auth tokens | User authentication and session management |
| Voice Synthesis | ElevenLabs | Voice recordings | Voice cloning and text-to-speech narration |
| AI Content Generation | Anthropic (Claude API) | Story generation prompts | Story text generation |
| AI Image Generation | Google (Vertex AI Imagen) | Story metadata | Cover artwork generation |
| Search Relevance | Cohere | Search queries, story metadata | Search result reranking |
| Error Monitoring | Sentry | Device info, error data, session replays | Error tracking and performance monitoring |

Each provider is subject to its own privacy policy and data handling practices. We select providers that maintain industry-standard security practices.

### 3.2 Legal Requirements

We may disclose your information if required to do so by law, regulation, legal process, or governmental request, or when we believe disclosure is necessary to protect our rights, your safety, or the safety of others.

### 3.3 Business Transfers

If Mello is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change in ownership or control.

### 3.4 With Your Consent

We may share your information for any other purpose with your explicit consent.

---

## 4. Children's Privacy

### 4.1 COPPA Compliance

Mello is not directed to children under the age of thirteen (13) within the meaning of the Children's Online Privacy Protection Act ("COPPA"), 15 U.S.C. 6501–6506, and its implementing regulations at 16 C.F.R. Part 312.

We do not knowingly collect personal information from children under 13. All account creation, data input, and interaction with the Service is performed by a parent or legal guardian who is at least 18 years of age.

### 4.2 Child Profile Data

The child age and topic preferences you provide during onboarding are associated with your adult account, not with a child's account. No child account exists. This data is used solely to filter and recommend age-appropriate content.

### 4.3 No Persistent Child Identifiers

We do not assign persistent identifiers to children, do not track children across services, and do not build profiles of children for any purpose.

### 4.4 Inadvertent Collection

If we learn that we have inadvertently collected personal information from a child under 13 without verifiable parental consent, we will delete that information promptly. If you believe a child under 13 has provided personal information to Mello, please contact us at [EMAIL].

---

## 5. Voice Data and Biometric Information

### 5.1 What We Collect

When you use the voice cloning feature, an individual you invite (e.g., a family member) records a voice sample through the Service. This voice sample is:

- An audio recording of at least 30 seconds in duration
- Stored in WebM format on our servers (Firebase Storage)
- Transmitted to ElevenLabs for voice cloning

### 5.2 How Voice Data Is Used

Voice recordings are used exclusively for:

- Creating a synthetic voice clone through ElevenLabs' Instant Voice Cloning API
- Generating narrated versions of stories using the cloned voice
- Storing the cloned voice on your account for future story conversions

Voice data is **not** used for:

- Identification or authentication of individuals
- Advertising, marketing, or sale to third parties
- Training general-purpose AI models
- Any purpose other than narrating stories within the Service

### 5.3 Biometric Data Notice

In certain jurisdictions, voice recordings and the voiceprints derived from them are classified as biometric data subject to specific legal protections, including but not limited to:

- **Illinois Biometric Information Privacy Act (BIPA)**, 740 ILCS 14
- **Texas Capture or Use of Biometric Identifier Act**, Tex. Bus. & Com. Code 503
- **Washington Biometric Identifiers Law**, RCW 19.375

If you reside in one of these jurisdictions, please be aware:

- **Purpose:** Voice data is collected for the sole purpose of creating a synthetic voice to narrate children's stories within the Mello Service.
- **Duration:** Voice data is retained for as long as the associated voice remains active on your account, or until you request deletion, whichever comes first.
- **Third-party disclosure:** Voice recordings are transmitted to ElevenLabs (our voice synthesis provider) for processing. ElevenLabs' handling of voice data is governed by their privacy policy.
- **Consent:** By using the voice cloning feature, you provide your informed, written consent to the collection, transmission, and processing of voice data as described herein. You are responsible for obtaining equivalent consent from any third party you invite to record a voice sample.

### 5.4 Voice Data Deletion

You may delete a cloned voice from your account at any time through the Service. Upon deletion:

- We will remove the voice recording and associated data from our servers
- We will request deletion of the cloned voice from ElevenLabs
- Converted story audio files using that voice will also be deleted
- Deletion from third-party systems may be subject to their data retention policies

---

## 6. Data Security

We implement commercially reasonable technical and organizational measures to protect your information, including:

- All data transmitted between your device and our servers is encrypted in transit (TLS/HTTPS)
- Data stored in Google Cloud Firestore and Cloud Storage is encrypted at rest using Google-managed encryption keys
- API access requires a valid Firebase authentication token verified server-side
- Access to production systems is restricted to authorized personnel

However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your data.

---

## 7. Data Retention

- **Account data** is retained for as long as your account is active.
- **Usage data** (listening history, favorites, search queries) is retained for the lifetime of your account.
- **Voice data** is retained until you delete the associated voice or your account.
- **Error monitoring data** (Sentry) is retained according to Sentry's data retention policies.

Upon account deletion, we will delete or anonymize your personal data within thirty (30) days, except where retention is required by law or necessary to resolve disputes, enforce our agreements, or fulfill our legal obligations.

---

## 8. Your Rights and Choices

### 8.1 Access and Portability

You may request a copy of the personal information we hold about you by contacting us at [EMAIL].

### 8.2 Correction

You may update your display name, child age, and preferred topics through the Service at any time.

### 8.3 Deletion

You may request deletion of your account and all associated data by contacting us at [EMAIL]. We will process your request within thirty (30) days.

### 8.4 Voice Data Deletion

You may delete individual cloned voices at any time through the Service without deleting your entire account.

### 8.5 California Residents (CCPA/CPRA)

If you are a California resident, you have additional rights under the California Consumer Privacy Act and the California Privacy Rights Act, including:

- The right to know what personal information we collect, use, and disclose
- The right to delete your personal information
- The right to opt out of the sale of personal information (we do not sell personal information)
- The right to non-discrimination for exercising your privacy rights

To exercise these rights, contact us at [EMAIL].

### 8.6 European Economic Area, United Kingdom, and Switzerland (GDPR)

If you are located in the EEA, UK, or Switzerland, you have additional rights under the General Data Protection Regulation, including:

- The right to access, correct, or delete your personal data
- The right to restrict or object to processing
- The right to data portability
- The right to withdraw consent at any time

Our legal basis for processing your data is: (a) performance of the contract (our Terms of Service), (b) your consent (for voice data processing), and (c) our legitimate interests (for service improvement and security).

To exercise these rights, contact us at [EMAIL].

---

## 9. International Data Transfers

Mello is operated from the United States. If you access the Service from outside the United States, your information will be transferred to and processed in the United States, where data protection laws may differ from those in your jurisdiction.

By using the Service, you consent to the transfer of your information to the United States. Where required by applicable law, we will implement appropriate safeguards for cross-border data transfers.

---

## 10. Third-Party Links

The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties. We encourage you to review their privacy policies before providing any information.

---

## 11. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. If we make material changes, we will notify you by posting the updated Privacy Policy on the Service and, where practicable, by email. Material changes affecting data collection practices, children's privacy, or voice data handling will require your affirmative re-consent before you may continue using the Service.

Your continued use of the Service after the effective date of an updated Privacy Policy constitutes your acceptance of the changes (except where re-consent is required).

---

## 12. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:

**Mello**
Email: [EMAIL]
Website: https://melostories.com

---

*This Privacy Policy is version 1.0.*
