import { pool, withTransaction } from './index.js';
import { runMigrations } from './migrate.js';

interface DummyLead {
  external_lead_id: string;
  full_name: string;
  email: string;
  phone: string;
  page_id: string;
  form_id: string;
  ad_id: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  created_minutes_ago: number;
  activities: Array<{
    type: 'LEAD_CREATED' | 'STATUS_CHANGED' | 'LEAD_UPDATED' | 'DUPLICATE_IGNORED';
    description: string;
    metadata: Record<string, any>;
    actor: string;
    minutes_after_creation: number;
  }>;
}

const dummyLeads: DummyLead[] = [
  // ==================== 1. NEW (3 Leads) ====================
  {
    external_lead_id: 'meta_lead_98234101',
    full_name: 'Sarah Connor',
    email: 'sarah.connor@cyberdyne.io',
    phone: '+1 415-555-0192',
    page_id: 'page_meta_cloud_solutions',
    form_id: 'form_enterprise_demo_q3',
    ad_id: 'ad_cloud_scale_2026_us',
    status: 'NEW',
    created_minutes_ago: 15,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook (form_id: form_enterprise_demo_q3)',
        metadata: { form_name: 'Enterprise Demo Request', campaign: 'Cloud Scale 2026' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_44820194',
    full_name: 'Carlos Mendez',
    email: 'carlos.m@agrilogistics.mx',
    phone: '+52 55 5123 4567',
    page_id: 'page_meta_ev_fleet',
    form_id: 'form_fleet_pricing_calculator',
    ad_id: 'ad_fleet_efficiency_video',
    status: 'NEW',
    created_minutes_ago: 45,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook (form_id: form_fleet_pricing_calculator)',
        metadata: { region: 'LATAM', fleet_size: 25 },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_11928401',
    full_name: 'Liam O\'Connor',
    email: 'liam.oc@dublindata.ie',
    phone: '+353 1 496 0123',
    page_id: 'page_meta_fintech_hub',
    form_id: 'form_security_audit_whitepaper',
    ad_id: 'ad_compliance_soc2_carousel',
    status: 'NEW',
    created_minutes_ago: 90,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook (Whitepaper download)',
        metadata: { form_name: 'SOC2 Compliance Whitepaper', campaign: 'FinTech Compliance' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
    ],
  },

  // ==================== 2. CONTACTED (3 Leads) ====================
  {
    external_lead_id: 'meta_lead_88349210',
    full_name: 'Marcus Vance',
    email: 'marcus.vance@solardrive.tech',
    phone: '+1 212-555-0144',
    page_id: 'page_meta_ev_fleet',
    form_id: 'form_fleet_pricing_calculator',
    ad_id: 'ad_fleet_efficiency_video',
    status: 'CONTACTED',
    created_minutes_ago: 180,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'EV Fleet 2026' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Initial outreach call placed. Sent product brochure via email.',
        metadata: { from_status: 'NEW', to_status: 'CONTACTED' },
        actor: 'rep:alex_chen',
        minutes_after_creation: 45,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_22849103',
    full_name: 'Priya Sharma',
    email: 'priya.sharma@novapayments.in',
    phone: '+91 98200 12345',
    page_id: 'page_meta_fintech_hub',
    form_id: 'form_enterprise_demo_q3',
    ad_id: 'ad_compliance_soc2_carousel',
    status: 'CONTACTED',
    created_minutes_ago: 320,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'FinTech API Ingestion' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Introductory email sent with calendar invite for discovery session.',
        metadata: { from_status: 'NEW', to_status: 'CONTACTED' },
        actor: 'rep:jessica_miller',
        minutes_after_creation: 60,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_38472910',
    full_name: 'Oliver Hansen',
    email: 'oliver.hansen@nordiclogistics.dk',
    phone: '+45 32 45 67 89',
    page_id: 'page_meta_ev_fleet',
    form_id: 'form_fleet_pricing_calculator',
    ad_id: 'ad_fleet_efficiency_video',
    status: 'CONTACTED',
    created_minutes_ago: 500,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'Nordic Clean Fleet' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Left voicemail and shared pricing sheet via WhatsApp Business.',
        metadata: { from_status: 'NEW', to_status: 'CONTACTED' },
        actor: 'rep:alex_chen',
        minutes_after_creation: 120,
      },
    ],
  },

  // ==================== 3. QUALIFIED (3 Leads) ====================
  {
    external_lead_id: 'meta_lead_77491023',
    full_name: 'Elena Rostova',
    email: 'elena.rostova@fintechapex.com',
    phone: '+44 20 7946 0912',
    page_id: 'page_meta_fintech_hub',
    form_id: 'form_security_audit_whitepaper',
    ad_id: 'ad_compliance_soc2_carousel',
    status: 'QUALIFIED',
    created_minutes_ago: 720,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'FinTech Compliance Whitepaper' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Discovery call completed. Budget ($50k+) and Q4 timeline confirmed.',
        metadata: { from_status: 'NEW', to_status: 'QUALIFIED', estimated_budget: 50000 },
        actor: 'rep:jessica_miller',
        minutes_after_creation: 90,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_33918472',
    full_name: 'Amina Al-Mansoor',
    email: 'amina@gulfbiotech.ae',
    phone: '+971 4 312 8900',
    page_id: 'page_meta_fintech_hub',
    form_id: 'form_enterprise_demo_q3',
    ad_id: 'ad_compliance_soc2_carousel',
    status: 'QUALIFIED',
    created_minutes_ago: 900,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'FinTech Compliance Whitepaper' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Technical evaluation in progress with CTO. Requirements verified.',
        metadata: { from_status: 'NEW', to_status: 'QUALIFIED' },
        actor: 'rep:alex_chen',
        minutes_after_creation: 120,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_49201948',
    full_name: 'Hiroshi Tanaka',
    email: 'h.tanaka@tokyoretail.jp',
    phone: '+81 3 5555 0143',
    page_id: 'page_meta_cloud_solutions',
    form_id: 'form_smb_starter_kit',
    ad_id: 'ad_smb_starter_promo',
    status: 'QUALIFIED',
    created_minutes_ago: 1200,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'SMB Global Scaling' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Security questionnaire approved by customer infosec team.',
        metadata: { from_status: 'NEW', to_status: 'QUALIFIED' },
        actor: 'rep:jessica_miller',
        minutes_after_creation: 300,
      },
    ],
  },

  // ==================== 4. CONVERTED (3 Leads) ====================
  {
    external_lead_id: 'meta_lead_66102948',
    full_name: 'David Kim',
    email: 'david.kim@nexusanalytics.co',
    phone: '+1 650-555-0188',
    page_id: 'page_meta_cloud_solutions',
    form_id: 'form_enterprise_demo_q3',
    ad_id: 'ad_cloud_scale_2026_us',
    status: 'CONVERTED',
    created_minutes_ago: 1800,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'Cloud Scale 2026' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Account executive demo presented.',
        metadata: { from_status: 'NEW', to_status: 'QUALIFIED' },
        actor: 'rep:alex_chen',
        minutes_after_creation: 180,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Annual Enterprise SLA signed. Customer onboarded.',
        metadata: { from_status: 'QUALIFIED', to_status: 'CONVERTED', contract_value: 120000 },
        actor: 'rep:alex_chen',
        minutes_after_creation: 720,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_83920184',
    full_name: 'Claire Dupont',
    email: 'claire.dupont@aeroparis.fr',
    phone: '+33 1 42 68 55 00',
    page_id: 'page_meta_ev_fleet',
    form_id: 'form_fleet_pricing_calculator',
    ad_id: 'ad_fleet_efficiency_video',
    status: 'CONVERTED',
    created_minutes_ago: 2400,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'EV Fleet 2026 Europe' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Fleet size: 100 vehicles confirmed.',
        metadata: { from_status: 'NEW', to_status: 'QUALIFIED' },
        actor: 'rep:jessica_miller',
        minutes_after_creation: 240,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Payment processed via Stripe Billing. License keys issued.',
        metadata: { from_status: 'QUALIFIED', to_status: 'CONVERTED', contract_value: 85000 },
        actor: 'rep:jessica_miller',
        minutes_after_creation: 1200,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_74910283',
    full_name: 'Lucas Silva',
    email: 'lucas.silva@saopaulotech.br',
    phone: '+55 11 98765 4321',
    page_id: 'page_meta_fintech_hub',
    form_id: 'form_enterprise_demo_q3',
    ad_id: 'ad_compliance_soc2_carousel',
    status: 'CONVERTED',
    created_minutes_ago: 3200,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'FinTech Compliance' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Custom integration scope finalized.',
        metadata: { from_status: 'NEW', to_status: 'QUALIFIED' },
        actor: 'rep:alex_chen',
        minutes_after_creation: 360,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Contract executed. Dedicated account manager assigned.',
        metadata: { from_status: 'QUALIFIED', to_status: 'CONVERTED', contract_value: 95000 },
        actor: 'rep:alex_chen',
        minutes_after_creation: 1800,
      },
    ],
  },

  // ==================== 5. LOST (3 Leads) ====================
  {
    external_lead_id: 'meta_lead_55291837',
    full_name: 'Rachel Green',
    email: 'rachel.g@smallretailers.org',
    phone: '+1 312-555-0177',
    page_id: 'page_meta_cloud_solutions',
    form_id: 'form_smb_starter_kit',
    ad_id: 'ad_smb_starter_promo',
    status: 'LOST',
    created_minutes_ago: 4200,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'SMB Starter Kit' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Attempted phone contact 3 times without response.',
        metadata: { from_status: 'NEW', to_status: 'CONTACTED' },
        actor: 'rep:jessica_miller',
        minutes_after_creation: 300,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Lead requested to unsubscribe / not interested in enterprise tier.',
        metadata: { from_status: 'CONTACTED', to_status: 'LOST', reason: 'budget_mismatch' },
        actor: 'rep:jessica_miller',
        minutes_after_creation: 1440,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_68201948',
    full_name: 'Arthur Pendelton',
    email: 'arthur.p@vintagecrafts.co.uk',
    phone: '+44 161 496 0888',
    page_id: 'page_meta_cloud_solutions',
    form_id: 'form_smb_starter_kit',
    ad_id: 'ad_smb_starter_promo',
    status: 'LOST',
    created_minutes_ago: 5000,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'SMB Starter Kit' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Company went with an existing legacy provider.',
        metadata: { from_status: 'NEW', to_status: 'LOST', reason: 'competitor_chosen' },
        actor: 'rep:alex_chen',
        minutes_after_creation: 720,
      },
    ],
  },
  {
    external_lead_id: 'meta_lead_91827364',
    full_name: 'Zoe Katsaros',
    email: 'zoe@hellasdigital.gr',
    phone: '+30 21 0772 1000',
    page_id: 'page_meta_fintech_hub',
    form_id: 'form_security_audit_whitepaper',
    ad_id: 'ad_compliance_soc2_carousel',
    status: 'LOST',
    created_minutes_ago: 6000,
    activities: [
      {
        type: 'LEAD_CREATED',
        description: 'Lead ingested from Meta Ads webhook',
        metadata: { campaign: 'FinTech Compliance' },
        actor: 'system:webhook',
        minutes_after_creation: 0,
      },
      {
        type: 'STATUS_CHANGED',
        description: 'Project cancelled by lead due to internal restructuring.',
        metadata: { from_status: 'NEW', to_status: 'LOST', reason: 'project_cancelled' },
        actor: 'rep:jessica_miller',
        minutes_after_creation: 1800,
      },
    ],
  },
];

export async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seed with dummy Meta leads and audit trails...');

  // Ensure migrations are run first
  await runMigrations();

  await withTransaction(async (client) => {
    let insertedCount = 0;
    let skippedCount = 0;

    for (const lead of dummyLeads) {
      // Check if lead already exists
      const existing = await client.query('SELECT id FROM leads WHERE external_lead_id = $1', [
        lead.external_lead_id,
      ]);

      if (existing.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const createdAt = new Date(Date.now() - lead.created_minutes_ago * 60 * 1000);
      const updatedAt = new Date(
        Date.now() -
          (lead.created_minutes_ago -
            (lead.activities[lead.activities.length - 1]?.minutes_after_creation || 0)) *
            60 *
            1000
      );

      const rawPayload = {
        object: 'page',
        entry: [
          {
            id: lead.page_id,
            time: Math.floor(createdAt.getTime() / 1000),
            changes: [
              {
                field: 'leadgen',
                value: {
                  leadgen_id: lead.external_lead_id,
                  page_id: lead.page_id,
                  form_id: lead.form_id,
                  ad_id: lead.ad_id,
                  created_time: Math.floor(createdAt.getTime() / 1000),
                  field_data: [
                    { name: 'full_name', values: [lead.full_name] },
                    { name: 'email', values: [lead.email] },
                    { name: 'phone_number', values: [lead.phone] },
                  ],
                },
              },
            ],
          },
        ],
      };

      const insertLeadSql = `
        INSERT INTO leads (
          external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'meta_ads', $5, $6, $7, $8, $9, $10, $11
        )
        RETURNING id
      `;

      const leadResult = await client.query<{ id: string }>(insertLeadSql, [
        lead.external_lead_id,
        lead.full_name,
        lead.email,
        lead.phone,
        lead.page_id,
        lead.form_id,
        lead.ad_id,
        lead.status,
        JSON.stringify(rawPayload),
        createdAt.toISOString(),
        updatedAt.toISOString(),
      ]);

      const leadId = leadResult.rows[0].id;
      insertedCount++;

      // Insert activities
      for (const act of lead.activities) {
        const actTime = new Date(
          createdAt.getTime() + act.minutes_after_creation * 60 * 1000
        );

        const insertActivitySql = `
          INSERT INTO activities (
            lead_id, type, description, metadata, actor, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          )
        `;

        await client.query(insertActivitySql, [
          leadId,
          act.type,
          act.description,
          JSON.stringify(act.metadata),
          act.actor,
          actTime.toISOString(),
        ]);
      }
    }

    console.log(`✅ Database seed completed: ${insertedCount} leads inserted, ${skippedCount} already existed.`);
  });
}

// Allow direct execution: npx tsx src/db/seed.ts
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Database seed error:', err);
      await pool.end();
      process.exit(1);
    });
}
