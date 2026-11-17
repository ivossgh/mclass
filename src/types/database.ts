export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ContactStatus = 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
export type ContactSource = 'MANUAL' | 'SPREADSHEET';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'PAUSED' | 'COMPLETED';
export type LogStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'BOUNCED' | 'CANCELLED';

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          status: ContactStatus;
          tags: string[];
          source: ContactSource;
          added_by: string | null;
          unsubscribe_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          status?: ContactStatus;
          tags?: string[];
          source?: ContactSource;
          added_by?: string | null;
          unsubscribe_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          status?: ContactStatus;
          tags?: string[];
          source?: ContactSource;
          added_by?: string | null;
          unsubscribe_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          subject: string;
          html_content: string;
          text_content: string | null;
          target_tags: string[];
          status: CampaignStatus;
          scheduled_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          html_content: string;
          text_content?: string | null;
          target_tags?: string[];
          status?: CampaignStatus;
          scheduled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          html_content?: string;
          text_content?: string | null;
          target_tags?: string[];
          status?: CampaignStatus;
          scheduled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_logs: {
        Row: {
          id: string;
          campaign_id: string;
          contact_id: string;
          status: LogStatus;
          provider_message_id: string | null;
          error_message: string | null;
          created_at: string;
          sent_at: string | null;
          opened_at: string | null;
          clicked_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          contact_id: string;
          status?: LogStatus;
          provider_message_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          sent_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          contact_id?: string;
          status?: LogStatus;
          provider_message_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          sent_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'campaign_logs_campaign_id_fkey';
            columns: ['campaign_id'];
            isOneToOne: false;
            referencedRelation: 'campaigns';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'campaign_logs_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_unsubscribe_info: {
        Args: { p_token: string };
        Returns: { masked_email: string; status: ContactStatus }[];
      };
      unsubscribe_contact: {
        Args: { p_token: string };
        Returns: boolean;
      };
      import_contacts_batch: {
        Args: { p_contacts: Json };
        Returns: { received: number; inserted: number; updated: number; ignored: number };
      };
      enqueue_campaign: {
        Args: { p_campaign_id: string };
        Returns: number;
      };
      claim_pending_emails: {
        Args: { p_batch_size?: number };
        Returns: {
          log_id: string;
          campaign_id: string;
          subject: string;
          html_content: string;
          text_content: string | null;
          contact_id: string;
          contact_email: string;
          contact_name: string | null;
          unsubscribe_token: string;
        }[];
      };
      finalize_completed_campaigns: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}