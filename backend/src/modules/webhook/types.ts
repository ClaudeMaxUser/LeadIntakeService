export interface MetaFieldData {
  name: string;
  values: string[];
}

export interface MetaWebhookPayload {
  leadgen_id: string;
  page_id?: string;
  form_id?: string;
  ad_id?: string;
  created_time?: string;
  field_data: MetaFieldData[];
}

export interface ExtractedLeadData {
  leadgen_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  page_id: string | null;
  form_id: string | null;
  ad_id: string | null;
}
