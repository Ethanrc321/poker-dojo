"""
generate_pdfs.py — Creates Poker Dojo Privacy Policy and Terms of Service PDFs.
Run: python3 generate_pdfs.py
Output: PRIVACY_POLICY.pdf and TERMS_OF_SERVICE.pdf in the same directory.
"""

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Colour palette ────────────────────────────────────────────────────────────
BLACK       = colors.HexColor('#111111')
DARK_GRAY   = colors.HexColor('#333333')
MID_GRAY    = colors.HexColor('#555555')
LIGHT_GRAY  = colors.HexColor('#888888')
RULE_GRAY   = colors.HexColor('#dddddd')
AMBER       = colors.HexColor('#e8a030')
AMBER_LIGHT = colors.HexColor('#fdf3e3')
WHITE       = colors.white

# ── Style factory ─────────────────────────────────────────────────────────────
def make_styles():
    base = getSampleStyleSheet()

    cover_brand = ParagraphStyle(
        'CoverBrand',
        fontName='Helvetica-Bold', fontSize=28,
        textColor=AMBER, alignment=TA_CENTER, spaceAfter=4,
    )
    cover_doc_title = ParagraphStyle(
        'CoverDocTitle',
        fontName='Helvetica-Bold', fontSize=18,
        textColor=BLACK, alignment=TA_CENTER, spaceAfter=6,
    )
    cover_sub = ParagraphStyle(
        'CoverSub',
        fontName='Helvetica', fontSize=10,
        textColor=LIGHT_GRAY, alignment=TA_CENTER, spaceAfter=2,
    )
    section_num = ParagraphStyle(
        'SectionNum',
        fontName='Helvetica-Bold', fontSize=13,
        textColor=AMBER, spaceBefore=18, spaceAfter=4,
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        fontName='Helvetica-Bold', fontSize=13,
        textColor=BLACK, spaceBefore=18, spaceAfter=4,
    )
    sub_heading = ParagraphStyle(
        'SubHeading',
        fontName='Helvetica-Bold', fontSize=10,
        textColor=DARK_GRAY, spaceBefore=10, spaceAfter=3,
    )
    body = ParagraphStyle(
        'Body',
        fontName='Helvetica', fontSize=9.5,
        textColor=DARK_GRAY, leading=15,
        alignment=TA_JUSTIFY, spaceAfter=6,
    )
    bullet = ParagraphStyle(
        'Bullet',
        fontName='Helvetica', fontSize=9.5,
        textColor=DARK_GRAY, leading=14,
        leftIndent=14, bulletIndent=0,
        spaceAfter=3,
    )
    highlight_box = ParagraphStyle(
        'HighlightBox',
        fontName='Helvetica-BoldOblique', fontSize=9.5,
        textColor=colors.HexColor('#7a4a00'),
        leading=14, spaceBefore=4, spaceAfter=4,
    )
    footer_style = ParagraphStyle(
        'Footer',
        fontName='Helvetica', fontSize=8,
        textColor=LIGHT_GRAY, alignment=TA_CENTER,
    )
    caps_warning = ParagraphStyle(
        'CapsWarning',
        fontName='Helvetica-Bold', fontSize=8.5,
        textColor=DARK_GRAY, leading=13,
        alignment=TA_JUSTIFY, spaceAfter=6,
    )
    table_header = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold', fontSize=8.5,
        textColor=WHITE,
    )
    table_cell = ParagraphStyle(
        'TableCell',
        fontName='Helvetica', fontSize=8.5,
        textColor=DARK_GRAY, leading=12,
    )

    return dict(
        cover_brand=cover_brand,
        cover_doc_title=cover_doc_title,
        cover_sub=cover_sub,
        section_num=section_num,
        section_heading=section_heading,
        sub_heading=sub_heading,
        body=body,
        bullet=bullet,
        highlight_box=highlight_box,
        footer_style=footer_style,
        caps_warning=caps_warning,
        table_header=table_header,
        table_cell=table_cell,
    )

S = make_styles()

# ── Helpers ───────────────────────────────────────────────────────────────────
def sp(n=6):
    return Spacer(1, n)

def rule():
    return HRFlowable(width='100%', thickness=1, color=RULE_GRAY, spaceAfter=4, spaceBefore=4)

def amber_rule():
    return HRFlowable(width='100%', thickness=2, color=AMBER, spaceAfter=8, spaceBefore=0)

def section(num, title):
    return KeepTogether([
        Paragraph(f'{num}. {title}', S['section_heading']),
        amber_rule(),
    ])

def sub(title):
    return Paragraph(title, S['sub_heading'])

def body(text):
    return Paragraph(text, S['body'])

def bullets(items):
    return [Paragraph(f'• &nbsp; {t}', S['bullet']) for t in items]

def caps(text):
    return Paragraph(text, S['caps_warning'])

def highlight(text):
    data = [[Paragraph(text, S['highlight_box'])]]
    t = Table(data, colWidths=[6.5 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), AMBER_LIGHT),
        ('BOX',        (0, 0), (-1, -1), 0.75, AMBER),
        ('LEFTPADDING',  (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING',   (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
        ('ROUNDEDCORNERS', [4]),
    ]))
    return t

def data_table(headers, rows, col_widths):
    header_row = [Paragraph(h, S['table_header']) for h in headers]
    data = [header_row] + [
        [Paragraph(str(c), S['table_cell']) for c in row]
        for row in rows
    ]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  colors.HexColor('#222222')),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [WHITE, colors.HexColor('#f9f9f9')]),
        ('GRID',          (0, 0), (-1, -1), 0.5, RULE_GRAY),
        ('LEFTPADDING',   (0, 0), (-1, -1), 7),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 7),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
    ]))
    return t

def cover_block(doc_title, subtitle):
    return [
        sp(60),
        Paragraph('POKER DOJO', S['cover_brand']),
        sp(4),
        Paragraph(doc_title, S['cover_doc_title']),
        sp(10),
        HRFlowable(width=2 * inch, thickness=2, color=AMBER, spaceAfter=10, spaceBefore=0),
        Paragraph(subtitle, S['cover_sub']),
        Paragraph('pokerdojo.app', S['cover_sub']),
        sp(80),
    ]

def make_doc(filename, title):
    path = os.path.join(OUT_DIR, filename)
    doc = SimpleDocTemplate(
        path,
        pagesize=LETTER,
        leftMargin=1 * inch, rightMargin=1 * inch,
        topMargin=0.85 * inch, bottomMargin=0.85 * inch,
        title=title,
        author='Poker Dojo',
    )
    return doc, path


# ═════════════════════════════════════════════════════════════════════════════
# PRIVACY POLICY
# ═════════════════════════════════════════════════════════════════════════════

def build_privacy_policy():
    doc, path = make_doc('PRIVACY_POLICY.pdf', 'Poker Dojo — Privacy Policy')
    story = []

    # Cover
    story += cover_block(
        'Privacy Policy',
        'Last updated: May 26, 2026  ·  Effective immediately upon download'
    )
    story.append(rule())

    # § 1
    story.append(section('1', 'Introduction'))
    story.append(body(
        'Poker Dojo ("we," "us," or "our") is a GTO poker training application. '
        'This Privacy Policy explains what information we collect when you use the App, '
        'how we use it, and the rights you have over your data. By using Poker Dojo, '
        'you agree to the practices described in this document.'
    ))
    story.append(body(
        'If you do not agree with this policy, please do not use the App.'
    ))

    # § 2
    story.append(section('2', 'Information We Collect'))
    story.append(sub('2.1 — Information You Provide'))
    story.append(body(
        '<b>Google Account Data</b> (optional): If you choose to sign in with Google, '
        'we receive your name, email address, and profile photo via Google\'s OAuth '
        'sign-in flow. Sign-in is entirely optional — the core training features are '
        'available without an account.'
    ))
    story.append(sub('2.2 — Information We Collect Automatically'))
    story += bullets([
        '<b>Training Statistics</b>: Your answers to training questions (correct/incorrect), '
        'drill type selected, position data, accuracy percentages, streak counts, and '
        'skill rating history. Stored locally on your device and, if you sign in, '
        'synced to our cloud database.',
        '<b>Subscription Status</b>: Whether you hold an active premium subscription. '
        'Stored locally on your device only.',
        '<b>App Preferences</b>: Your haptic feedback setting. Stored locally on your device only.',
        '<b>Notification Tokens</b>: A device token used to deliver scheduled local '
        'notifications (daily practice reminders, stamina refill alerts). Notifications '
        'are generated on-device and not sent through a third-party marketing system.',
        '<b>Stamina State</b>: How many free training hands remain and when they were '
        'depleted. Stored locally on your device only.',
    ])
    story.append(sub('2.3 — Information We Do Not Collect'))
    story.append(body('We do <b>not</b> collect:'))
    story += bullets([
        'Real names, postal addresses, or phone numbers',
        'Payment card numbers or banking information (purchases are processed entirely by Apple)',
        'Location data or GPS coordinates',
        'Browsing history or cross-app tracking data',
        'Any personal information from users under the age of 13',
    ])

    # § 3
    story.append(section('3', 'How We Use Your Information'))
    story.append(body('We use the information we collect to:'))
    story += bullets([
        '<b>Provide and improve the App</b>: Deliver training scenarios, track your progress, and personalise your experience',
        '<b>Sync your progress</b>: If you sign in, back up your training stats so they persist across devices',
        '<b>Send local notifications</b>: Remind you to practice daily and alert you when your stamina refills',
        '<b>Process subscriptions</b>: Verify your subscription status to unlock premium features (payment is handled by Apple)',
        '<b>Display advertisements</b> (free tier only): Show ads to support the free version of the App',
    ])
    story.append(body('We do <b>not</b>:'))
    story += bullets([
        'Sell your personal information to any third party',
        'Use your data for behavioural advertising profiling',
        'Use your data for any purpose unrelated to delivering the poker training service',
    ])

    # § 4 — Third Parties Table
    story.append(section('4', 'Third-Party Services'))
    story.append(body(
        'Poker Dojo uses the following third-party services. Each operates under its own '
        'privacy policy, linked below.'
    ))
    story.append(sp(6))
    story.append(data_table(
        ['Service', 'Purpose', 'Privacy Policy'],
        [
            ['Google Firebase / Firestore', 'User authentication & cloud stats storage (signed-in users)', 'firebase.google.com/support/privacy'],
            ['Google OAuth', 'Sign-In with Google', 'policies.google.com/privacy'],
            ['Apple App Store / StoreKit', 'Subscription purchase & receipt validation', 'apple.com/legal/privacy'],
            ['Ad Network (free tier, coming soon)', 'Interstitial ads for non-subscribers', 'To be disclosed upon integration'],
        ],
        [2.0 * inch, 2.5 * inch, 2.0 * inch],
    ))
    story.append(sp(6))
    story.append(body(
        'We do not share your personal data with any party beyond those listed above, '
        'and only to the extent necessary to provide the service.'
    ))

    # § 5
    story.append(section('5', 'Data Storage and Security'))
    story += bullets([
        '<b>Local data</b> (preferences, stamina, streak, skill rating): Stored exclusively '
        'on your device using your operating system\'s standard secure app storage. '
        'We cannot access this data remotely.',
        '<b>Cloud data</b> (training statistics): If you sign in, your stats are stored in '
        'Google Firebase Firestore under your unique Firebase user ID, protected by '
        'security rules that allow only your authenticated account to access your data. '
        'All data is encrypted in transit (TLS) and at rest.',
    ])
    story.append(body(
        'We retain your cloud data for as long as your account exists. You may request '
        'deletion at any time (see Section 7). We will notify you of any breach affecting '
        'your personal data as required by applicable law.'
    ))

    # § 6
    story.append(section('6', 'Children\'s Privacy'))
    story.append(highlight(
        '⚠  Poker Dojo is not directed at children under the age of 13. We do not '
        'knowingly collect personal information from anyone under 13. If you are a parent '
        'or guardian and believe your child has provided us with personal information, '
        'please contact us immediately at privacy@pokerdojo.app and we will delete '
        'the data promptly.'
    ))

    # § 7
    story.append(section('7', 'Your Rights and Choices'))
    story.append(sub('All Users'))
    story += bullets([
        '<b>Access</b>: Request a copy of the data we hold about you',
        '<b>Deletion</b>: Request deletion of your account and cloud data by contacting us, '
        'or clear local data via Settings → Reset All Stats',
        '<b>Notifications</b>: Disable at any time via device Settings → Notifications → Poker Dojo',
        '<b>Sign out</b>: Disconnect your Google account via Settings → Account → Sign Out',
    ])
    story.append(sub('EU / EEA Users (GDPR)'))
    story.append(body(
        'You additionally have the right to data portability, restriction of processing, '
        'and to lodge a complaint with your local data protection authority. Our legal basis '
        'for processing signed-in users\' data is the performance of a service contract.'
    ))
    story.append(sub('California Residents (CCPA)'))
    story.append(body(
        'We do not sell your personal information. You have the right to know what '
        'information we collect and to request its deletion. Contact us at the address '
        'in Section 9 to exercise these rights.'
    ))

    # § 8
    story.append(section('8', 'Advertising (Free Tier)'))
    story.append(body(
        'If you use the free version of Poker Dojo, interstitial advertisements may be '
        'shown after every 20 training hands. These ads are served by a third-party ad '
        'network (to be disclosed when integrated). That network may collect certain device '
        'identifiers (such as your IDFA on iOS) for ad delivery and measurement purposes. '
        'You can limit ad tracking in your device\'s Privacy settings.'
    ))
    story.append(body(
        '<b>Premium subscribers do not see any advertisements.</b>'
    ))

    # § 9
    story.append(section('9', 'Changes to This Policy'))
    story.append(body(
        'We may update this Privacy Policy from time to time. When we do, we will update '
        'the "Last updated" date at the top of this document. For material changes, we will '
        'notify you through the App or by email (if you are signed in). Your continued use '
        'of the App after changes are posted constitutes your acceptance of the updated policy.'
    ))

    # § 10
    story.append(section('10', 'Contact Us'))
    story.append(body('For questions about this Privacy Policy or to exercise your data rights:'))
    story += bullets([
        'Email: <b>privacy@pokerdojo.app</b>',
        'Website: <b>pokerdojo.app</b>',
    ])
    story.append(sp(20))
    story.append(rule())
    story.append(Paragraph(
        'Poker Dojo  ·  pokerdojo.app  ·  privacy@pokerdojo.app  ·  © 2026 Poker Dojo. All rights reserved.',
        S['footer_style']
    ))

    doc.build(story)
    return path


# ═════════════════════════════════════════════════════════════════════════════
# TERMS OF SERVICE
# ═════════════════════════════════════════════════════════════════════════════

def build_terms_of_service():
    doc, path = make_doc('TERMS_OF_SERVICE.pdf', 'Poker Dojo — Terms of Service')
    story = []

    # Cover
    story += cover_block(
        'Terms of Service',
        'Last updated: May 26, 2026  ·  Effective immediately upon download'
    )
    story.append(rule())

    # § 1
    story.append(section('1', 'Acceptance of Terms'))
    story.append(body(
        'By downloading, installing, or using Poker Dojo ("the App"), you agree to be '
        'bound by these Terms of Service ("Terms"). If you do not agree, do not use the App.'
    ))
    story.append(body(
        'These Terms constitute a legally binding agreement between you and the developer '
        'of Poker Dojo ("we," "us," or "our").'
    ))

    # § 2
    story.append(section('2', 'Description of the App'))
    story.append(body(
        'Poker Dojo is an <b>educational poker training application</b> designed to teach '
        'poker strategy, mathematics, and decision-making through interactive drills and scenarios.'
    ))
    story.append(highlight(
        '⚠  IMPORTANT: Poker Dojo does NOT involve real money of any kind. '
        'Poker Dojo does NOT offer prizes, rewards, or anything of monetary value. '
        'Poker Dojo is NOT a gambling application. '
        'In-app ratings or points have no cash value and cannot be redeemed or transferred. '
        'The App is for educational and entertainment purposes ONLY.'
    ))

    # § 3
    story.append(section('3', 'Eligibility'))
    story.append(body(
        'You must be at least <b>13 years old</b> to use Poker Dojo. By using the App, '
        'you represent and warrant that you meet this age requirement.'
    ))
    story.append(body(
        'Because the App involves poker content, we recommend it for users aged <b>18 and over</b> '
        'in jurisdictions where poker is legal. It is your sole responsibility to ensure your '
        'use of the App complies with the laws of your jurisdiction.'
    ))

    # § 4
    story.append(section('4', 'User Accounts'))
    story.append(body(
        'You may use most features of Poker Dojo without creating an account. '
        'If you choose to sign in with Google:'
    ))
    story += bullets([
        'You authorise us to receive your Google account name, email address, and profile photo '
        'for the purpose of identifying your account and syncing your training data',
        'You are responsible for maintaining the security of your Google account',
        'You may sign out or request deletion of your data at any time',
        'Your identity is managed entirely through Google\'s authentication system — we do not '
        'create or manage passwords',
    ])

    # § 5
    story.append(section('5', 'Subscriptions and Billing'))

    story.append(sub('5.1 — Free Tier'))
    story.append(body(
        'Poker Dojo offers a free tier that includes the Preflop trainer (limited to 20 hands '
        'per session via a stamina system), basic charts, and access to rewarded ads to restore stamina.'
    ))

    story.append(sub('5.2 — Premium Subscription'))
    story.append(body(
        'Premium unlocks all trainers (Postflop, Math Drills, Hand Reading, Glossary), '
        'removes the stamina system entirely, and removes all advertisements.'
    ))

    story.append(sub('5.3 — Free Trial'))
    story.append(highlight(
        'A 7-day free trial is available to new subscribers. You will not be charged during '
        'the trial period. If you do not cancel at least 24 hours before the trial ends, '
        'your subscription will automatically begin and your Apple ID will be charged.'
    ))

    story.append(sub('5.4 — Pricing'))
    story.append(data_table(
        ['Plan', 'Price', 'Billing Cycle'],
        [
            ['Monthly', '$9.99 USD', 'Every month'],
            ['Yearly',  '$79.99 USD (~$6.67/month)', 'Every 12 months'],
        ],
        [2.5 * inch, 2.5 * inch, 1.5 * inch],
    ))
    story.append(sp(6))
    story.append(body(
        'Prices are in USD and may vary by region. The exact price shown at the time '
        'of purchase in the App Store applies.'
    ))

    story.append(sub('5.5 — Auto-Renewal'))
    story.append(body(
        'Subscriptions automatically renew unless cancelled at least <b>24 hours before '
        'the end of the current billing period</b>. Your Apple ID account will be charged '
        'within 24 hours before the end of each period at the then-current subscription rate.'
    ))

    story.append(sub('5.6 — How to Cancel'))
    story.append(body(
        'You can manage or cancel your subscription at any time through your Apple ID '
        'account settings: <b>Settings → [Your Name] → Subscriptions → Poker Dojo</b>. '
        'Cancelling stops future renewals. You retain premium access until the end of '
        'the current paid period.'
    ))

    story.append(sub('5.7 — Refunds'))
    story.append(body(
        'All purchases are processed by Apple. Refund requests must be submitted directly '
        'to Apple at <b>reportaproblem.apple.com</b>. We have no ability to issue refunds '
        'independently of Apple\'s refund process.'
    ))

    story.append(sub('5.8 — Price Changes'))
    story.append(body(
        'We may change subscription prices with reasonable advance notice. Price changes '
        'take effect at your next renewal date. Continued use of a premium subscription '
        'after a price change constitutes acceptance of the new price.'
    ))

    # § 6
    story.append(section('6', 'Acceptable Use'))
    story.append(body('You agree not to:'))
    story += bullets([
        'Reverse engineer, decompile, or disassemble the App or any part of it',
        'Attempt to circumvent subscription or feature restrictions by any technical means',
        'Use the App for any unlawful purpose or in violation of any applicable law',
        'Transmit any harmful, offensive, or disruptive content through any feature of the App',
        'Share your account credentials with other individuals',
        'Use automated tools, bots, or scripts to interact with the App',
        'Reproduce, distribute, or create derivative works from any App content without '
        'our prior written permission',
    ])

    # § 7
    story.append(section('7', 'Intellectual Property'))
    story.append(body(
        'All content in Poker Dojo — including training scenarios, GTO range data, '
        'educational content, artwork, code, and the Poker Dojo name and logo — is '
        'owned by or licensed to us and is protected by copyright, trademark, and other '
        'intellectual property laws.'
    ))
    story.append(body(
        'You are granted a limited, non-exclusive, non-transferable, revocable licence '
        'to use the App on your personal device for personal, non-commercial use. This '
        'licence does not include the right to reproduce, distribute, or create derivative '
        'works from any App content.'
    ))

    # § 8
    story.append(section('8', 'Disclaimers'))
    story.append(sub('8.1 — No Warranty'))
    story.append(caps(
        'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, '
        'EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, '
        'FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT '
        'THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL '
        'COMPONENTS.'
    ))
    story.append(sub('8.2 — Educational Purpose Only'))
    story.append(body(
        'The poker strategy, GTO ranges, and mathematical guidance in Poker Dojo are '
        'provided for educational purposes only. We make no guarantee that applying any '
        'strategy taught in the App will result in winning at poker. Real-money poker '
        'outcomes depend on many factors outside our control.'
    ))
    story.append(sub('8.3 — Not Gambling Advice'))
    story.append(body(
        'Nothing in Poker Dojo constitutes advice to gamble or play poker for money. '
        'We are not responsible for any financial losses incurred while playing real-money '
        'poker or engaging in any gambling activity.'
    ))

    # § 9
    story.append(section('9', 'Limitation of Liability'))
    story.append(caps(
        'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT BE LIABLE FOR '
        'ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING '
        'FROM YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF '
        'PROFITS, OR PERSONAL INJURY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY '
        'OF SUCH DAMAGES.'
    ))
    story.append(caps(
        'OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM USE OF THE APP SHALL NOT '
        'EXCEED THE AMOUNT YOU PAID FOR YOUR CURRENT SUBSCRIPTION PERIOD, OR TEN DOLLARS '
        '($10 USD) IF YOU ARE ON THE FREE TIER.'
    ))
    story.append(body(
        'Some jurisdictions do not allow limitation of liability for certain types of '
        'damages. In those jurisdictions, our liability is limited to the fullest extent '
        'permitted by applicable law.'
    ))

    # § 10
    story.append(section('10', 'Termination'))
    story.append(body(
        'We reserve the right to suspend or terminate your access to the App if you '
        'violate these Terms, with or without notice. Upon termination, your right to '
        'use the App ceases immediately. Provisions of these Terms that by their nature '
        'should survive termination will do so, including Sections 7, 8, 9, and 11.'
    ))

    # § 11
    story.append(section('11', 'Governing Law and Disputes'))
    story.append(body(
        'These Terms are governed by the laws of the State of <b>[Your State]</b>, '
        'United States, without regard to conflict-of-law principles.'
    ))
    story.append(body(
        'Any dispute arising from these Terms or your use of the App shall first be '
        'attempted to be resolved informally by contacting us at legal@pokerdojo.app. '
        'If informal resolution fails within 30 days, disputes shall be resolved through '
        'binding arbitration under the rules of the American Arbitration Association, '
        'conducted in <b>[Your State]</b>. Either party may seek injunctive relief in '
        'a court of competent jurisdiction for intellectual property matters.'
    ))
    story.append(body(
        '<b>Class Action Waiver</b>: You agree that any dispute resolution proceedings '
        'will be conducted only on an individual basis and not in a class, consolidated, '
        'or representative action.'
    ))

    # § 12
    story.append(section('12', 'Changes to These Terms'))
    story.append(body(
        'We may update these Terms from time to time. When we do, we will update the '
        '"Last updated" date. For material changes, we will notify you through the App '
        'or by email if you are signed in. Your continued use of the App after changes '
        'are posted constitutes acceptance of the updated Terms.'
    ))

    # § 13
    story.append(section('13', 'Contact Us'))
    story.append(body('For questions about these Terms or legal matters:'))
    story += bullets([
        'Email: <b>legal@pokerdojo.app</b>',
        'Website: <b>pokerdojo.app</b>',
    ])

    story.append(sp(20))
    story.append(rule())
    story.append(Paragraph(
        'Poker Dojo  ·  pokerdojo.app  ·  legal@pokerdojo.app  ·  © 2026 Poker Dojo. All rights reserved.',
        S['footer_style']
    ))

    doc.build(story)
    return path


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    pp = build_privacy_policy()
    tos = build_terms_of_service()
    print(f'✓  Privacy Policy  →  {pp}')
    print(f'✓  Terms of Service →  {tos}')
