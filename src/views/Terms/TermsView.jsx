import React from 'react'

const TermsView = () => {
  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        lineHeight: '1.6',
      }}
    >
      <h1>Terms of Service</h1>
      <p>
        <strong>Last updated August 12, 2026</strong>
      </p>

      <h2>1. Agreement</h2>
      <p>
        By creating an account or using Donetick Cloud at donetick.com (the
        "Service"), you agree to these Terms. If you don't agree, don't use the
        Service. Donetick is made by Favoro LLC ("we", "us", "our").
      </p>

      <h2>2. Cloud vs. self-hosted</h2>
      <p>Donetick comes in two flavors, and they're governed differently.</p>
      <p>
        <strong>Donetick Cloud</strong> is the hosted service we run at
        donetick.com. These Terms cover it.
      </p>
      <p>
        <strong>Self-hosted Donetick</strong> is the open-source software you
        run on your own server. It's licensed under the GNU Affero General
        Public License v3 (AGPLv3), and that license, not these Terms, governs
        your rights to use, modify, and share it. Nothing here is meant to
        restrict anything the AGPLv3 grants you.
      </p>
      <p>
        If you run Donetick yourself, hosting, security, backups, updates, and
        data-protection obligations are yours, not ours. We don't provide
        support guarantees for self-hosted installs unless we've agreed to that
        separately in writing.
      </p>

      <h2>3. What Donetick does</h2>
      <p>
        Donetick helps you and the people in your circle track tasks, chores,
        and recurring schedules. It's a productivity tool, not professional,
        legal, financial, or medical advice.
      </p>

      <h2>4. Your account</h2>
      <p>
        You're responsible for your account and for keeping your login secure.
        You must be at least 13 years old (or the age of digital consent where
        you live) to use the Service. Provide accurate information, and tell us
        promptly if you think someone else has gotten into your account.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        Don't use Donetick to break the law, infringe anyone's rights, upload
        malware, harass other users, send spam, gain unauthorized access to our
        systems or anyone's account, circumvent usage limits, or overload the
        Service.
      </p>
      <p>
        Don't use Donetick Cloud to run a competing hosted service without our
        written permission. This applies only to our Cloud Service and takes
        nothing away from your AGPLv3 rights to the self-hosted software.
      </p>

      <h2>6. Your content</h2>
      <p>
        You own everything you put into Donetick: your tasks, chores, labels,
        comments, and files. You grant us a limited license to host, store,
        process, and transmit it solely to operate, secure, troubleshoot, and
        improve the Service for you. We don't sell your content, and we don't
        use it to train AI models.
      </p>
      <p>
        You're responsible for having the right to upload what you upload, and
        for managing who you share circles and content with. We may remove
        content when reasonably necessary to enforce these Terms, comply with
        the law, or address a security issue, and we'll give you notice first
        where that's practical.
      </p>
      <p>
        How we handle personal information is covered in our{' '}
        <a href='/privacy'>Privacy Policy</a>, including what our analytics and
        error reporting do and don't collect, and how to turn them off.
      </p>

      <h2>7. Availability</h2>
      <p>
        We aim for roughly 99% monthly availability on the Cloud Service, but
        that's a goal, not a service-level agreement, and there are no downtime
        credits. We may pause parts of the Service for maintenance, security, or
        emergencies, and we'll announce planned work ahead of time when we
        reasonably can. Storage limits, API rate limits, and fair-use limits may
        apply.
      </p>

      <h2>8. Plans and billing</h2>
      <p>
        Donetick offers a free plan and paid plans billed monthly or annually in
        advance through Stripe. Paid plans renew automatically until you cancel.
      </p>
      <p>
        You can cancel any time from your settings. Cancelling stops future
        renewals, and you keep paid features through the end of the current
        billing period. If a payment fails we may retry it or limit paid
        features until it goes through. We'll give you reasonable notice before
        a price change applies to your subscription. Refunds are handled
        case-by-case at our discretion, except where the law requires one.
        Nothing here limits your consumer-protection rights.
      </p>

      <h2>9. Your data and export</h2>
      <p>
        Where export tools are available, you can export your content; formats
        and availability may change over time. If we ever discontinue the Cloud
        Service, we'll give reasonable advance notice and, where possible, a
        chance to export first.
      </p>

      <h2>10. Third-party integrations</h2>
      <p>
        Donetick connects to outside services like messaging platforms,
        authentication providers, and webhooks. Those are governed by their own
        terms and privacy policies, and we're not responsible for services we
        don't control. Make sure you're authorized to connect whatever you
        connect.
      </p>

      <h2>11. Our brand</h2>
      <p>
        You own your content; we own the Donetick name, logo, branding, and the
        proprietary parts of the Cloud Service. The AGPLv3 covers the software,
        not our trademarks, so please don't use our name or logo in a way that
        suggests we endorse or sponsor you.
      </p>

      <h2>12. Termination</h2>
      <p>
        You can stop using Donetick and delete your account at any time from
        Settings. We may suspend or end access if you violate these Terms, or
        where we need to address abuse, fraud, a security incident, a legal
        obligation, or unpaid fees. Where it's practical, we'll give you notice
        and a chance to fix the problem first. After termination we delete or
        anonymize your content per our retention practices, though limited
        records may stick around for legal, security, or accounting reasons.
      </p>

      <h2>13. Security reports</h2>
      <p>
        Found a vulnerability? Please email{' '}
        <a href='mailto:support@donetick.com'>support@donetick.com</a> and give
        us a reasonable chance to fix it before disclosing it publicly.
      </p>

      <h2>14. Disclaimers and liability</h2>
      <p>
        <strong>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES
          OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT
          WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE,
          OR THAT DATA WILL NEVER BE LOST OR CORRUPTED.
        </strong>
      </p>
      <p>
        <strong>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, FAVORO LLC IS NOT LIABLE FOR
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
          DAMAGES, OR FOR LOST PROFITS, REVENUE, BUSINESS, GOODWILL, OR DATA.
          OUR TOTAL LIABILITY IS LIMITED TO THE GREATER OF WHAT YOU PAID US IN
          THE 12 MONTHS BEFORE THE CLAIM, OR $100.
        </strong>
      </p>
      <p>
        Self-hosted installs are covered by the AGPLv3's warranty disclaimer.
        We're not responsible for problems arising from your own infrastructure,
        configuration, modifications, or hosting provider. Nothing in these
        Terms excludes liability that can't legally be excluded.
      </p>

      <h2>15. Indemnification</h2>
      <p>
        To the extent the law allows, you agree to cover Favoro LLC against
        third-party claims arising from your violation of these Terms, your
        unlawful use of the Service, your infringement of someone else's rights,
        or content you submitted. We'll give you reasonable notice of any such
        claim and cooperate in the defense.
      </p>

      <h2>16. Disputes and governing law</h2>
      <p>
        Before filing anything, please email{' '}
        <a href='mailto:support@donetick.com'>support@donetick.com</a> and give
        us a fair chance to sort it out. These Terms are governed by the laws of
        the State of Delaware, USA, without regard to conflict-of-laws rules,
        and disputes go to the state or federal courts in Delaware. Either of us
        can still bring an eligible claim in small claims court, and none of
        this waives rights that can't legally be waived.
      </p>

      <h2>17. Changes</h2>
      <p>
        We may update these Terms. We'll post the new version with an updated
        date, and for material changes we'll give reasonable advance notice by
        email or in-app notice (and get your consent where the law requires it).
        Continuing to use the Service after non-material changes means you
        accept them. If you don't agree to a material change, cancel before it
        takes effect.
      </p>

      <h2>18. The fine print</h2>
      <p>
        These Terms plus our Privacy Policy are the whole agreement between us.
        If one provision turns out to be unenforceable, it gets trimmed to the
        minimum necessary and the rest stands. Not enforcing something once
        doesn't waive it later. You can't transfer these Terms without our
        consent; we may transfer them in a merger, acquisition, or sale of
        assets. These Terms don't create a partnership, employment, or agency
        relationship. Neither of us is liable for delays caused by things
        outside our reasonable control. Provisions that should survive
        termination do, including those on content, intellectual property,
        disclaimers, liability, indemnification, and disputes.
      </p>

      <h2>19. Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href='mailto:support@donetick.com'>support@donetick.com</a>.
      </p>

      <hr />
      <p>Favoro LLC</p>
    </div>
  )
}

export default TermsView
