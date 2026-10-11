// Generated from the Supabase schema. Regenerate after schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      admins: Table<{ created_at: string; email: string }, "email">;
      capabilities: Table<
        {
          body: string;
          id: string;
          published: boolean;
          short_body: string;
          sort: number;
          title: string;
          updated_at: string;
        },
        "title"
      >;
      enquiries: Table<
        {
          admin_notes: string;
          booking_start: string | null;
          booking_uid: string | null;
          budget: string;
          company: string;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          service: string;
          status: string;
          timeline: string;
          updated_at: string;
          whatsapp: string;
        },
        "email" | "message" | "name"
      >;
      experience: Table<
        {
          end_date: string | null;
          highlights: string;
          id: string;
          meta: string;
          org: string;
          published: boolean;
          sort: number;
          start_date: string;
          summary: string;
          title: string;
          updated_at: string;
        },
        "org" | "start_date" | "title"
      >;
      media: Table<
        {
          alt: string;
          created_at: string;
          height: number | null;
          id: string;
          mime: string;
          path: string;
          size_bytes: number;
          width: number | null;
        },
        "path"
      >;
      messages: Table<
        {
          admin_notes: string;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          status: string;
          updated_at: string;
          whatsapp: string;
        },
        "email" | "message" | "name"
      >;
      page_blocks: Table<
        { content: Json; key: string; page: string; updated_at: string },
        "key" | "page"
      >;
      process_steps: Table<
        { body: string; id: string; sort: number; title: string; updated_at: string },
        "title"
      >;
      projects: Table<
        {
          created_at: string;
          featured: boolean;
          id: string;
          image_alt: string;
          image_path: string | null;
          live_url: string | null;
          published: boolean;
          role: string;
          slug: string;
          sort: number;
          summary: string;
          tags: string[];
          title: string;
          updated_at: string;
          year: string;
        },
        "slug" | "title"
      >;
      services: Table<
        {
          body: string;
          id: string;
          published: boolean;
          sort: number;
          tags: string[];
          title: string;
          updated_at: string;
        },
        "title"
      >;
      site_settings: Table<
        {
          budget_options: string[];
          cal_link: string;
          cv_path: string | null;
          display_name: string;
          email: string;
          full_name: string;
          github_url: string;
          id: boolean;
          linkedin_url: string;
          location: string;
          motto: string;
          og_image_path: string | null;
          phone: string;
          portrait_alt: string;
          portrait_path: string | null;
          role_line: string;
          seo_description: string;
          seo_title: string;
          service_options: string[];
          taglines: string[];
          timeline_options: string[];
          updated_at: string;
          whatsapp: string;
        },
        never
      >;
      skills: Table<
        { id: string; name: string; published: boolean; sort: number; updated_at: string },
        "name"
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      am_i_admin: { Args: never; Returns: boolean };
      reorder_rows: { Args: { p_table: string; p_ids: string[] }; Returns: undefined };
      submit_enquiry: {
        Args: {
          p_budget: string;
          p_company: string;
          p_email: string;
          p_message: string;
          p_name: string;
          p_service: string;
          p_timeline: string;
          p_whatsapp: string;
        };
        Returns: string;
      };
      submit_message: {
        Args: { p_email: string; p_message: string; p_name: string; p_whatsapp: string };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
