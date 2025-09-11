import React from 'react'

const TermsView = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', lineHeight: '1.6' }}>
      <h1>Terms of Service</h1>
      <p><em>Effective Date: January 1, 2024</em></p>

      <p>
        These Terms of Service ("Terms") govern your access to and use of the
        Donetick task management platform provided by Favoro LLC ("Donetick", "we", "us", or "our"). 
        By accessing or using our services, you agree to be bound by these Terms. If you do not agree to
        these Terms, you may not access or use our services.
      </p>

      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
        <h3>Important: Cloud vs. Self-Hosted Services</h3>
        <p>
          Donetick is available in two deployment models with different terms and responsibilities:
        </p>
        <ul>
          <li><strong>Cloud-Hosted Service:</strong> Hosted at donetick.com where we provide infrastructure and data management</li>
          <li><strong>Self-Hosted Service:</strong> Open-source software you deploy on your own infrastructure</li>
        </ul>
        <p>Please review the applicable sections carefully as they define different rights and obligations.</p>
      </div>

      <h2>1. Definitions</h2>
      <ul>
        <li><strong>"Cloud Service"</strong> refers to the Donetick platform hosted at donetick.com and managed by Favoro LLC</li>
        <li><strong>"Self-Hosted Service"</strong> refers to the open-source Donetick software deployed on user-controlled infrastructure</li>
        <li><strong>"Content"</strong> means all data, information, tasks, files, and other materials you create, upload, or store using our services</li>
        <li><strong>"Circle"</strong> means a collaborative workspace shared between users for task management</li>
      </ul>

      <h2>2. Eligibility and Account Registration</h2>
      <ul>
        <li>You must be at least 13 years old to use our services</li>
        <li>Users under 18 must have parental consent</li>
        <li>You are responsible for maintaining the confidentiality of your account credentials</li>
        <li>You must provide accurate and complete information when creating an account</li>
        <li>One person or legal entity may maintain only one account</li>
      </ul>

      <h2>3. Cloud-Hosted Service Terms</h2>
      <p><em>This section applies only to users of the Cloud Service at donetick.com</em></p>

      <h3>3.1 Service Availability and Uptime</h3>
      <ul>
        <li>We strive to maintain 99.5% uptime for the Cloud Service on a monthly basis</li>
        <li>Scheduled maintenance will be announced at least 24 hours in advance when possible</li>
        <li>We reserve the right to temporarily suspend service for emergency maintenance</li>
        <li>No SLA credits or compensation are provided for downtime unless otherwise specified in a separate agreement</li>
      </ul>

      <h3>3.2 Data Ownership and Responsibility</h3>
      <ul>
        <li><strong>Your Data:</strong> You retain ownership of all Content you create or upload</li>
        <li><strong>Our Responsibility:</strong> We provide secure hosting, backup, and infrastructure management</li>
        <li><strong>Data Portability:</strong> You can export your data at any time through our export features</li>
        <li><strong>Data Retention:</strong> We retain your data for 90 days after account deletion to allow recovery</li>
      </ul>

      <h3>3.3 Subscriptions and Billing</h3>
      <ul>
        <li>Cloud Service subscriptions are billed monthly or annually in advance</li>
        <li>Subscription fees will automatically renew unless cancelled before the next billing cycle</li>
        <li>You may cancel your subscription at any time through your account settings</li>
        <li>Upon cancellation, you retain access until the end of your current billing period</li>
        <li>We may modify subscription prices with 30 days advance notice</li>
        <li>Refunds are considered on a case-by-case basis at our discretion</li>
      </ul>

      <h3>3.4 Cloud Service Limitations</h3>
      <ul>
        <li>Storage limits apply based on your subscription tier</li>
        <li>API rate limits may be enforced to ensure service stability</li>
        <li>We may suspend accounts that exceed reasonable usage limits</li>
      </ul>

      <h2>4. Self-Hosted Service Terms</h2>
      <p><em>This section applies to users deploying Donetick on their own infrastructure</em></p>

      <h3>4.1 Open Source License</h3>
      <ul>
        <li>The Self-Hosted Service is provided under the MIT License</li>
        <li>You may modify, distribute, and use the software for any purpose</li>
        <li>Attribution to Donetick must be maintained in derivative works</li>
        <li>No warranty or support is provided for self-hosted deployments</li>
      </ul>

      <h3>4.2 User Responsibility</h3>
      <ul>
        <li><strong>Infrastructure:</strong> You are solely responsible for hosting, maintenance, security, and backups</li>
        <li><strong>Data Protection:</strong> You are the data controller and responsible for compliance with applicable laws</li>
        <li><strong>Updates:</strong> You are responsible for applying security updates and patches</li>
        <li><strong>Support:</strong> No technical support is provided for self-hosted installations</li>
      </ul>

      <h3>4.3 Limitation of Our Responsibility</h3>
      <ul>
        <li>We provide no guarantees about the performance or security of self-hosted deployments</li>
        <li>We are not responsible for any data loss, security breaches, or service interruptions in self-hosted environments</li>
        <li>Technical support is limited to community forums and documentation</li>
      </ul>

      <h2>5. Acceptable Use Policy</h2>
      <p><em>Applies to both Cloud and Self-Hosted Services</em></p>
      
      <h3>You may not use our services to:</h3>
      <ul>
        <li>Violate any applicable laws or regulations</li>
        <li>Infringe on intellectual property rights</li>
        <li>Transmit malicious code or conduct security attacks</li>
        <li>Harass, abuse, or harm other users</li>
        <li>Distribute spam or unwanted communications</li>
        <li>Attempt to reverse engineer our proprietary systems (Cloud Service)</li>
        <li>Resell or redistribute the service without permission</li>
      </ul>

      <h2>6. Content and Data</h2>

      <h3>6.1 Your Content Rights</h3>
      <ul>
        <li>You retain ownership of all Content you create</li>
        <li>You grant us the necessary rights to operate the service (Cloud Service only)</li>
        <li>You are responsible for ensuring you have rights to any Content you upload</li>
      </ul>

      <h3>6.2 Content Restrictions</h3>
      <ul>
        <li>Content must not violate any laws or third-party rights</li>
        <li>Content must not contain malicious code or harmful materials</li>
        <li>We may remove Content that violates these Terms (Cloud Service only)</li>
      </ul>

      <h2>7. Privacy and Security</h2>
      <ul>
        <li>Your privacy is important to us - please review our Privacy Policy</li>
        <li>We implement industry-standard security measures (Cloud Service)</li>
        <li>You are responsible for security in self-hosted deployments</li>
        <li>Report security vulnerabilities to security@donetick.com</li>
      </ul>

      <h2>8. Intellectual Property</h2>
      <ul>
        <li>The Donetick name, logo, and proprietary features are our intellectual property</li>
        <li>The open-source codebase is licensed under MIT License</li>
        <li>You may not use our trademarks without written permission</li>
      </ul>

      <h2>9. Third-Party Integrations</h2>
      <ul>
        <li>Donetick integrates with third-party services (Telegram, Discord, webhooks, etc.)</li>
        <li>Your use of these integrations is subject to their respective terms</li>
        <li>We are not responsible for third-party service availability or functionality</li>
      </ul>

      <h2>10. Liability and Warranties</h2>

      <h3>10.1 Disclaimer of Warranties</h3>
      <p>
        Our services are provided "as is" and "as available" without any warranty of any kind, 
        express or implied, including but not limited to merchantability, fitness for a particular purpose, 
        or non-infringement.
      </p>

      <h3>10.2 Cloud Service Liability</h3>
      <ul>
        <li>Our total liability for the Cloud Service is limited to the amount you paid in the 12 months preceding the claim</li>
        <li>We are not liable for indirect, incidental, special, or consequential damages</li>
        <li>We maintain appropriate insurance and implement security best practices</li>
      </ul>

      <h3>10.3 Self-Hosted Service Liability</h3>
      <ul>
        <li>We provide no warranties or guarantees for self-hosted deployments</li>
        <li>Our liability is limited to the maximum extent permitted by law</li>
        <li>You assume all risks associated with self-hosting</li>
      </ul>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold us harmless from any claims, damages, or expenses 
        arising from your use of our services, violation of these Terms, or infringement of any rights.
      </p>

      <h2>12. Termination</h2>

      <h3>12.1 Termination by You</h3>
      <ul>
        <li>You may terminate your account at any time</li>
        <li>Cloud Service: Access continues until the end of your billing period</li>
        <li>Self-Hosted Service: You may stop using the software at any time</li>
      </ul>

      <h3>12.2 Termination by Us</h3>
      <ul>
        <li>We may terminate accounts that violate these Terms</li>
        <li>We may discontinue the Cloud Service with 90 days notice</li>
        <li>We will provide data export capabilities before termination when possible</li>
      </ul>

      <h2>13. Changes to These Terms</h2>
      <ul>
        <li>We may update these Terms from time to time</li>
        <li>Material changes will be announced via email or in-app notification</li>
        <li>Continued use after changes constitutes acceptance of new Terms</li>
        <li>For significant changes, we may require explicit acceptance</li>
      </ul>

      <h2>14. Dispute Resolution</h2>
      <ul>
        <li>We encourage resolving disputes informally by contacting us first</li>
        <li>These Terms are governed by the laws of Delaware, United States</li>
        <li>Any disputes will be resolved in the courts of Delaware</li>
        <li>You may pursue small claims court for eligible disputes</li>
      </ul>

      <h2>15. Miscellaneous</h2>
      <ul>
        <li>If any provision is found unenforceable, the remainder remains in effect</li>
        <li>Our failure to enforce any right does not waive that right</li>
        <li>These Terms constitute the entire agreement between us</li>
        <li>We may assign these Terms; you may not without our consent</li>
      </ul>

      <h2>16. Contact Information</h2>
      <p>
        If you have questions about these Terms, please contact us:
      </p>
      <ul>
        <li><strong>Email:</strong> legal@donetick.com</li>
        <li><strong>Support:</strong> support@donetick.com</li>
        <li><strong>Address:</strong> Favoro LLC, [Address to be provided]</li>
      </ul>

      <hr style={{ margin: '40px 0' }} />
      <p style={{ fontSize: '14px', color: '#666' }}>
        <strong>Last Updated:</strong> January 1, 2024<br />
        These Terms of Service are effective immediately for new users and will become effective 
        for existing users 30 days after posting.
      </p>
    </div>
  )
}

export default TermsView
