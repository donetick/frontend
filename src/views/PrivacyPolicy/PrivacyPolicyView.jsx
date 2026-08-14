const PrivacyPolicyView = () => {
  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        lineHeight: '1.6',
      }}
    >
      <h1>Privacy Policy</h1>
      <p>
        <em>How Donetick handles your data</em>
      </p>
      <p>
        <strong>Last updated August 12, 2026</strong>
      </p>

      <p>
        Donetick is made by Favoro LLC ("we", "us", "our"). This policy covers
        the Donetick Cloud Service and our website. If you run Donetick
        yourself, your data lives on your own server and you control it. Only
        the analytics section below applies, and only if you opt in.
      </p>

      <h2>1. What we collect</h2>
      <p>
        • <strong>Account info:</strong> your email, your name, and the circle
        (household or group) you belong to.
      </p>
      <p>
        • <strong>Your content:</strong> the tasks, chores, labels, notes, and
        schedules you create.
      </p>
      <p>
        • <strong>Usage data:</strong> basic, privacy-respecting information
        about how the app is used so we can keep it working and improve it.
      </p>
      <p>
        • <strong>Billing:</strong> if you upgrade, payment is handled by
        Stripe. We never see or store your full card details.
      </p>

      <h2>2. How we use it</h2>
      <p>
        To run the core product: store and sync your tasks across your devices,
        remind you when things are due, share chores with your circle, and
        provide support. We use your content to operate the Service for you, not
        to build advertising profiles, and never to train AI models.
      </p>

      <h2>3. Analytics and error reports</h2>
      <p>
        We use{' '}
        <a href='https://posthog.com' target='_blank' rel='noreferrer'>
          PostHog
        </a>{' '}
        to see which features are used and to catch crashes. Every event is
        checked against a fixed list of allowed properties before it is sent, so
        only this can leave your device: feature usage (for example, that a task
        was created and whether it had a due date), technical details about your
        installation (platform, OS version, app version, Cloud or self-hosted),
        whether your account is on a paid plan and how many people are in your
        circle, and, for errors, status codes and stack traces.
      </p>
      <p>
        We never send the content of your tasks, chores, notes, search queries,
        circle names, or label names. We don't use session recording or
        automatic click capture.
      </p>
      <p>
        For our public website we also use{' '}
        <a href='https://plausible.io' target='_blank' rel='noreferrer'>
          Plausible
        </a>
        , a privacy-friendly analytics tool that counts page views without
        cookies, without cross-site tracking, and without building a profile of
        you.
      </p>

      <h2>4. Your analytics choices</h2>
      <p>
        Product analytics and crash reporting are two separate switches under{' '}
        <strong>Settings → Privacy &amp; Analytics</strong>. On the Cloud
        Service they're on by default and you can turn them off at any time. On
        self-hosted installations they're off by default and require you to opt
        in. Turning one off stops new data of that type immediately.
      </p>

      <h2>5. Where it lives</h2>
      <p>
        Cloud Service data is stored on our hosted infrastructure, scoped so
        that only you and the circle you share with can access it. Files you
        upload, like task photos and attachments, are kept in secure cloud
        object storage provided by Cloudflare, and are served over private,
        expiring links rather than public URLs. We use reasonable safeguards to
        protect all of it, though no system on the internet is perfectly secure.
      </p>

      <h2>6. Sharing</h2>
      <p>
        We don't sell your data. We share it only with the service providers
        that make Donetick work (Cloudflare for hosting and file storage,
        PostHog and Plausible for analytics, Stripe for payments), or when
        required by law.
      </p>

      <h2>7. Your choices</h2>
      <p>
        You can update your profile and permanently delete your account at any
        time from <strong>Settings</strong>. Deleting your account removes your
        content from our systems. You can also opt out of promotional emails
        using the unsubscribe link in any of them.
      </p>

      <h2>8. Retention</h2>
      <p>
        We keep your data while your account is active. When you delete your
        account, we delete your content (backups age out on a rolling basis).
      </p>

      <h2>9. Children</h2>
      <p>
        Donetick isn't directed to children under 13, and we don't knowingly
        collect their data. Child accounts created by a parent inside a circle
        are managed by that parent.
      </p>

      <h2>10. Changes</h2>
      <p>
        We'll post any updates here with a new date, and flag material changes
        with a one-time notice inside the app.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions or requests? Email{' '}
        <a href='mailto:support@donetick.com'>support@donetick.com</a>.
      </p>

      <hr />
      <p>Favoro LLC</p>
    </div>
  )
}

export default PrivacyPolicyView
