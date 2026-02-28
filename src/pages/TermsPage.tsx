import React, { useState, useEffect } from 'react';
import { FileText, Shield, ArrowLeft } from 'lucide-react';
import { LandingHeader } from '../components/LandingHeader';

const parseMarkdown = (content: string): React.ReactNode => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inTable = false;
  let tableRows: string[][] = [];
  let currentParagraph = '';
  let inCodeBlock = false;
  let codeContent = '';

  const flushParagraph = () => {
    if (currentParagraph.trim()) {
      let text = currentParagraph.trim();

      const generateId = (txt: string) => txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (text.startsWith('## ')) {
        const id = generateId(text.slice(3));
        elements.push(<h3 key={elements.length} id={id} className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3 scroll-mt-20">{text.slice(3)}</h3>);
      } else if (text.startsWith('### ')) {
        const id = generateId(text.slice(4));
        elements.push(<h4 key={elements.length} id={id} className="text-lg font-bold text-slate-800 dark:text-white mt-4 mb-2 scroll-mt-20">{text.slice(4)}</h4>);
      } else if (text.startsWith('#### ')) {
        const id = generateId(text.slice(5));
        elements.push(<h5 key={elements.length} id={id} className="text-md font-bold text-slate-800 dark:text-white mt-3 mb-2 scroll-mt-20">{text.slice(5)}</h5>);
      } else if (text.startsWith('# ')) {
        const id = generateId(text.slice(2));
        elements.push(<h2 key={elements.length} id={id} className="text-2xl font-black text-slate-900 dark:text-white mt-8 mb-4 scroll-mt-20">{text.slice(2)}</h2>);
      } else if (text.startsWith('**') && text.endsWith('**')) {
        elements.push(<p key={elements.length} className="font-bold text-slate-700 dark:text-slate-200 my-2">{text.replace(/\*\*/g, '')}</p>);
      } else {
        text = text
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="text-amber-600 dark:text-amber-400 hover:underline">$1</a>')
          .replace(/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="https://$1" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 hover:underline">$1</a>');
        elements.push(<p key={elements.length} className="text-slate-600 dark:text-slate-300 my-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />);
      }
      currentParagraph = '';
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={elements.length} className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 ml-4 my-2">
            {currentList.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{
                __html: item
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="text-amber-600 dark:text-amber-400 hover:underline">$1</a>')
                  .replace(/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="https://$1" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 hover:underline">$1</a>')
              }} />
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={elements.length} className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 ml-4 my-2">
            {currentList.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{
                __html: item
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="text-amber-600 dark:text-amber-400 hover:underline">$1</a>')
                  .replace(/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="https://$1" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 hover:underline">$1</a>')
              }} />
            ))}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(<pre key={elements.length} className="bg-slate-800 text-slate-200 p-4 rounded-lg my-4 overflow-x-auto"><code>{codeContent}</code></pre>);
        codeContent = '';
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    if (line.startsWith('|') && !inTable) {
      flushParagraph();
      flushList();
      inTable = true;
      tableRows = [];
    }

    if (inTable) {
      if (line.trim().startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        if (!line.includes('---')) {
          tableRows.push(cells);
        }
      } else {
        if (tableRows.length > 0) {
          const headerRow = tableRows[0];
          elements.push(
            <div key={elements.length} className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
                <thead>
                  <tr>
                    {headerRow.map((cell, idx) => (
                      <th key={idx} className="border border-slate-300 dark:border-slate-600 px-4 py-2 bg-slate-100 dark:bg-slate-800 font-bold text-left text-slate-900 dark:text-white">{cell}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.slice(1).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-300">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        inTable = false;
        tableRows = [];
        if (line.trim() === '') continue;
      }
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      flushParagraph();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(line.replace(/^\d+\.\s/, ''));
    } else if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      const quoteContent = line.slice(2);
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-amber-500 pl-4 py-2 my-4 bg-amber-50 dark:bg-amber-900/20 text-slate-700 dark:text-slate-300 italic">
          {quoteContent}
        </blockquote>
      );
    } else if (line.startsWith('> [!')) {
      flushParagraph();
      flushList();
      const match = line.match(/> \[!(\w+)\]\s*(.*)/);
      if (match) {
        const [, type, text] = match;
        const styles: Record<string, string> = {
          CAUTION: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200',
          WARNING: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-200',
          NOTE: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-200',
          TIP: 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200',
        };
        elements.push(
          <div key={elements.length} className={`p-4 my-4 border-l-4 ${styles[type] || styles.NOTE}`}>
            <div className="font-bold">{type}</div>
            {text && <div>{text}</div>}
          </div>
        );
      }
    } else if (line.startsWith('---')) {
      flushParagraph();
      flushList();
      elements.push(<hr key={elements.length} className="my-8 border-t border-slate-200 dark:border-slate-700" />);
    } else {
      flushList();
      currentParagraph += (currentParagraph ? '\n' : '') + line;
    }
  }

  flushParagraph();
  flushList();

  return elements;
};

const sections = [
  { id: '1-terms-of-service', title: 'Terms of Service' },
  { id: '2-privacy-policy', title: 'Privacy Policy' },
  { id: '3-acceptable-use-policy', title: 'Acceptable Use' },
  { id: '4-cookie-policy', title: 'Cookie Policy' },
  { id: '5-subscription-billing-policy', title: 'Billing' },
  { id: '6-disclaimer-limitation-of-liability', title: 'Liability' },
  { id: '7-refund-cancellation-policy', title: 'Refunds' },
  { id: '8-data-retention-deletion-policy', title: 'Data Retention' },
  { id: '9-contact-information', title: 'Contact' },
  { id: '10-governing-law-dispute-resolution', title: 'Governing Law' },
];

const policyContent = `
# CabEngine — Policies & Legal Documentation

## Effective Date: February 18, 2026
## Last Updated: February 18, 2026
## Status: Public Beta

> CabEngine is currently in Public Beta. Features, pricing, and terms may change as the product evolves. By using this service, you acknowledge and accept that you are using pre-release software.

------------------------------------------------------------------------------------------------------------------------------------------

## 1. Terms of Service

### 1.1 Agreement to Terms

By accessing or using CabEngine ("the Service"), available at www.protradee.com, you ("User", "you", "your") agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not access or use the Service.

### 1.2 Description of Service

CabEngine is a cloud-based Software-as-a-Service (SaaS) application designed for cabinet makers and tradespeople. The Service provides tools for:
- **Project Management** — Create and manage cabinet projects
- **Cabinet Design & Editing** — Elevation view (XY) and 3D visual editor for wall zones and cabinet layouts
- **Bill of Materials (BOM)** — Automated material, hardware, and labour cost estimation with configurable margin calculations
- **Cutting Plan Optimisation** — Material nesting and cut plan generation to minimise waste
- **Wall Plans** — Technical elevation drawings for workshop reference
- **Quick Parts Calculator** — Standalone parts calculation for individual components
- **Area Calculator** — Surface area and coverage calculations
- **Export & Reporting** — Print, JSON, Excel, and Invoice exports

### 1.3 Eligibility

You must be at least 18 years of age or the age of majority in your jurisdiction to use the Service. By using the Service, you represent and warrant that you meet this eligibility requirement.

### 1.4 Account Registration

- You must provide a valid email address and create a password to register.
- You are responsible for maintaining the confidentiality of your login credentials.
- You are fully responsible for all activities that occur under your account.
- You agree to notify us immediately of any unauthorised use of your account.

### 1.5 Beta Programme

CabEngine is currently offered as a **Public Beta** product. This means:
- The Service may contain bugs, errors, or incomplete features.
- Features may be added, modified, or removed without prior notice.
- Uptime and availability are provided on a **best-effort basis** — no SLA (Service Level Agreement) is guaranteed.
- Data generated during the beta period may not be preserved in future releases, although we will make reasonable efforts to maintain data continuity.

### 1.6 Intellectual Property

- All rights, title, and interest in and to the Service, including all associated intellectual property rights, are and shall remain the exclusive property of CabEngine and its licensors.
- The Service is protected by copyright, trademark, and other applicable laws.
- You are granted a limited, non-exclusive, non-transferable, revocable licence to use the Service for its intended purpose.
- Your project data, designs, and outputs generated through the Service remain your property.

### 1.7 User-Generated Content

-You retain ownership of all project data, cabinet specifications, BOM data, and any other content you create using the Service ("User Content").
- By using the Service, you grant CabEngine a limited licence to process, store, and transmit your User Content solely for the purpose of providing the Service.
- You are solely responsible for the accuracy, completeness, and legality of your User Content.

### 1.8 Modifications to Terms

We reserve the right to modify these Terms at any time. Changes will be communicated via email or through in-app notification. Your continued use of the Service after changes are posted constitutes your acceptance of the modified Terms.

------------------------------------------------------------------------------------------------------------------------------------------

## 2. Privacy Policy

### 2.1 Information We Collect

**Account Information:**
- Email address
- Password (stored in hashed form)
- Display name or shop name (if provided)

**Project Data:**
- Cabinet specifications, dimensions, and configurations
- Bill of Materials (BOM) data, including material costs and pricing
- Cutting plans and optimisation data
- Project names and metadata

**Usage Data:**
- Device type and browser information
- IP address
- Pages accessed and features used
- Session duration and frequency of use
- Error logs and crash reports

**Cookies & Local Storage:**
- Authentication tokens
- User preferences (e.g., dark/light mode, measurement units, currency)

### 2.2 How We Use Your Information

We use collected information to:

| Purpose | Legal Basis |
|---------|-------------|
| Provide and operate the Service | Contract performance |
| Authenticate users and secure accounts | Legitimate interest |
| Process subscription payments | Contract performance |
| Improve the Service and fix bugs | Legitimate interest |
| Send service-related notifications | Contract performance |
| Analyse usage patterns (aggregated, anonymised) | Legitimate interest |
| Respond to support requests | Contract performance |

### 2.3 Data Sharing

We **do not sell, rent, or trade** your personal information to third parties.

We may share information with:

- **Service Providers** — Third-party hosting, payment processing, and analytics providers who process data on our behalf and are bound by contractual data protection obligations.
- **Legal Requirements** — When required by law, regulation, or legal process.
- **Business Transfers** — In connection with a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity.

### 2.4 Data Security

We implement industry-standard security measures to protect your data, including:
- HTTPS/TLS encryption for all data in transit
- Encrypted storage for passwords and sensitive data
- Regular security reviews and updates
However, **no method of electronic storage or transmission is 100% secure**, and we cannot guarantee absolute security.

### 2.5 Your Rights

Depending on your jurisdiction, you may have the right to:
- **Access** your personal data
- **Correct** inaccurate personal data
- **Delete** your personal data ("right to be forgotten")
- **Export** your project data in standard formats (JSON, Excel)
- **Object** to processing of your personal data
- **Withdraw consent** at any time
To exercise any of these rights, contact us at the address provided in **Section 9**.

### 2.6 Children's Privacy

The Service is not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we discover that a child under 18 has provided personal information, we will delete it promptly.

------------------------------------------------------------------------------------------------------------------------------------------

## 3. Acceptable Use Policy

### 3.1 Permitted Use

The Service is intended for lawful, professional, and commercial use by cabinet makers, joiners, interior designers, and tradespeople for the purpose of cabinet design, material estimation, and project management.

### 3.2 Prohibited Conduct

You agree not to:
- Use the Service for any unlawful or fraudulent purpose
- Attempt to reverse-engineer, decompile, or disassemble the Service
- Interfere with or disrupt the Service's infrastructure or other users' access
- Use automated bots, scrapers, or crawlers to access the Service
- Resell, sublicence, or redistribute access to the Service without written permission
- Upload or transmit malicious code, viruses, or harmful content
- Attempt to gain unauthorised access to other users' accounts or data
- Use the Service to generate fraudulent quotations or misleading pricing

### 3.3 Enforcement

Violation of this Acceptable Use Policy may result in:
- Temporary or permanent suspension of your account
- Termination of your subscription without refund
- Legal action, if warranted

------------------------------------------------------------------------------------------------------------------------------------------

## 4. Cookie Policy

### 4.1 What Are Cookies

Cookies are small data files stored on your device when you access the Service. We use cookies and similar technologies (e.g., local storage) to enhance your experience.

### 4.2 Types of Cookies We Use

| Cookie Type | Purpose | Duration |
|-------------|---------|----------|
| Essential | Authentication, session management, security | Session / persistent |
| Functional | User preferences (theme, units, currency) | Persistent |
| Analytics | Usage patterns, feature adoption (anonymised) | Persistent |

### 4.3 Managing Cookies

You can manage or disable cookies through your browser settings. However, disabling essential cookies may prevent the Service from functioning correctly.

------------------------------------------------------------------------------------------------------------------------------------------

## 5. Subscription & Billing Policy

### 5.1 Subscription Plans

CabEngine operates on a **subscription-based model**. Current plans and pricing are displayed within the Service and may change as we transition from beta to general availability.

### 5.2 Beta Pricing

During the public beta period:
- Subscription fees are offered at reduced introductory rates.
- Pricing is subject to change upon general availability release.
- Subscribers will receive advance notice of any pricing changes.

### 5.3 Payment Terms

- Subscription fees are billed **in advance** on a recurring basis (monthly or annually, depending on the plan selected).
- All fees are quoted and charged in the applicable currency (e.g., LKR or as displayed at checkout).
- Payment is processed through our third-party payment provider.
- You authorise us to charge your designated payment method for all applicable fees.

### 5.4 Failed Payments

- If a payment fails, we will attempt to process it again within a reasonable timeframe.
- After repeated failed payment attempts, your account may be downgraded or suspended until payment is resolved.
- No data will be deleted immediately upon account suspension — see Section 8.

### 5.5 Taxes

All stated prices are exclusive of applicable taxes unless otherwise specified. You are responsible for any applicable sales tax, VAT, or GST in your jurisdiction.

------------------------------------------------------------------------------------------------------------------------------------------

## 6. Disclaimer & Limitation of Liability

> [!CAUTION] PLEASE READ THIS SECTION CAREFULLY. IT LIMITS CABENGINE'S LIABILITY TO YOU.

### 6.1 "As Is" and "As Available"

THE SERVICE IS PROVIDED **"AS IS"** AND **"AS AVAILABLE"** WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO:

- IMPLIED WARRANTIES OF MERCHANTABILITY
- FITNESS FOR A PARTICULAR PURPOSE
- NON-INFRINGEMENT
- ACCURACY OR RELIABILITY OF RESULTS

### 6.2 No Professional Advice

CabEngine is a **calculation and estimation tool**. The BOM calculations, cost estimates, cutting plans, and material lists generated by the Service are provided as **aids and reference tools only**.
- The Service does **not** constitute professional engineering, architectural, or structural advice.
- All outputs (including material quantities, cost estimates, margin calculations, and quotations) must be **independently verified by the User** before reliance.
- CabEngine is **not responsible** for any errors, omissions, or inaccuracies in generated outputs.

### 6.3 Limitation of Liability

**TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:**

CabEngine, its directors, employees, affiliates, and licensors shall **NOT** be liable for any **indirect, incidental, special, consequential, or punitive damages**, including but not limited to:

- Loss of profits, revenue, or business
- Loss of data or project information
- Cost of procurement of substitute services
- Loss arising from inaccurate BOM, quotation, or cutting plan outputs
- Damages arising from downtime or unavailability of the Service
- Any other intangible losses

**IN NO EVENT** shall CabEngine's total aggregate liability to you for all claims arising from or related to the Service exceed the **total amount paid by you to CabEngine in the twelve (12) months preceding the claim**, or **fifty US dollars (USD $50)**, whichever is greater.

### 6.4 Assumption of Risk

You acknowledge and agree that:

- You use the Service **at your own risk**.
- You are solely responsible for verifying all calculations, measurements, quantities, and cost estimates before quoting to your clients or purchasing materials.
- CabEngine bears **no responsibility** for any financial loss, material waste, project delays, or client disputes arising from your reliance on the Service's outputs.
- As a **beta product**, the Service may contain bugs or produce unexpected results — you accept this risk.

### 6.5 Indemnification

You agree to indemnify, defend, and hold harmless CabEngine, its officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from:
- Your use of the Service
- Your violation of these Terms
- Your violation of any third-party rights
- Any claim made by your clients or customers relating to quotations, estimates, or plans generated using the Service

### 6.6 Force Majeure

CabEngine shall not be liable for any failure or delay in performance resulting from causes beyond its reasonable control, including but not limited to natural disasters, acts of government, internet or infrastructure outages, pandemics, or third-party service failures.

------------------------------------------------------------------------------------------------------------------------------------------

## 7. Refund & Cancellation Policy

### 7.1 Cancellation

- You may cancel your subscription at any time through your account settings or by contacting support.
- Cancellation takes effect at the end of the current billing period.
- You will retain access to paid features until the end of your current billing period.

### 7.2 Refunds

- **No refunds** are provided for partial billing periods.
- No refunds are provided for any period during which the Service was available and accessible, regardless of actual usage.
- In exceptional circumstances (extended outages, billing errors), refunds may be granted at CabEngine's sole discretion.

### 7.3 Free Trial / Beta Access

- If you are using the Service under a free trial or beta programme, no charges apply and no refund is applicable.
- CabEngine reserves the right to end the free trial or beta programme at any time with reasonable notice.

------------------------------------------------------------------------------------------------------------------------------------------

## 8. Data Retention & Deletion Policy

### 8.1 Active Accounts

Your project data, account information, and settings are retained for as long as your account is active and you maintain a valid subscription.

### 8.2 Cancelled Accounts

Upon cancellation:
- Your data will be retained for 30 days after the end of your billing period to allow for potential reactivation.
- After the 30-day grace period, your data may be permanently deleted.
- We recommend exporting your projects (JSON, Excel) before cancelling.

### 8.3 Account Deletion Requests

You may request full deletion of your account and all associated data at any time by contacting support. Deletion requests will be processed within 30 days.

### 8.4 Anonymised Data

We may retain anonymised, aggregated data (which cannot be used to identify you) for analytics and service improvement purposes indefinitely.

------------------------------------------------------------------------------------------------------------------------------------------

## 9. Contact Information

For questions, concerns, or requests regarding these policies, please contact us:

- **Email:** support@protradee.com
- **Website:** www.protradee.com
- **In-App:** Use the "Report an Issue" button within the application

------------------------------------------------------------------------------------------------------------------------------------------

## 10. Governing Law & Dispute Resolution

### 10.1 Governing Law

These Terms and all related policies shall be governed by and construed in accordance with the laws of the jurisdiction in which CabEngine operates, without regard to its conflict of law provisions.

### 10.2 Dispute Resolution

Any dispute arising from or related to these Terms or the Service shall first be resolved through good-faith negotiation. If the dispute cannot be resolved through negotiation within 30 days, either party may seek resolution through binding arbitration in accordance with the rules of the applicable arbitration body in the governing jurisdiction.

### 10.3 Class Action Waiver

To the maximum extent permitted by applicable law, you agree that any disputes shall be resolved on an individual basis, and you waive any right to participate in a class action, collective action, or representative proceeding.

------------------------------------------------------------------------------------------------------------------------------------------

## 11. Severability

If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect.

------------------------------------------------------------------------------------------------------------------------------------------

## 12. Entire Agreement

These Terms, together with the Privacy Policy, Acceptable Use Policy, Cookie Policy, and all other policies referenced herein, constitute the entire agreement between you and CabEngine regarding your use of the Service and supersede all prior agreements, representations, and understandings.

© 2026 CabEngine / ProTradee. All rights reserved.
`;

interface TermsPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({
  onSignIn,
  onGetStarted,
  isDark,
  setIsDark
}) => {
  const [activeSection, setActiveSection] = useState('1-terms-of-service');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setActiveSection(hash);
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-slate-950">
      <LandingHeader
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      {/* Content */}
      <div className="max-w-6xl mx-auto flex pt-14 sm:pt-16">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-slate-200 dark:border-slate-800 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${activeSection === section.id
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{section.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6 md:p-8">
          <div className="max-w-3xl">
            {parseMarkdown(policyContent)}
          </div>
        </main>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500 dark:text-slate-400">
          © 2026 CabEngine / ProTradee. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
