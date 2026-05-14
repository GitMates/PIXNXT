export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          collection_id: string
          contact_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["activity_type"]
          id: number
          ip_hash: string | null
          metadata: Json | null
          photo_id: string | null
          photographer_id: string
          resolution: Database["public"]["Enums"]["download_resolution"] | null
          session_id: string | null
          visitor_email: string | null
        }
        Insert: {
          collection_id: string
          contact_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["activity_type"]
          id?: number
          ip_hash?: string | null
          metadata?: Json | null
          photo_id?: string | null
          photographer_id: string
          resolution?: Database["public"]["Enums"]["download_resolution"] | null
          session_id?: string | null
          visitor_email?: string | null
        }
        Update: {
          collection_id?: string
          contact_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["activity_type"]
          id?: number
          ip_hash?: string | null
          metadata?: Json | null
          photo_id?: string | null
          photographer_id?: string
          resolution?: Database["public"]["Enums"]["download_resolution"] | null
          session_id?: string | null
          visitor_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "client_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sessions: {
        Row: {
          access_level: string
          collection_id: string
          contact_id: string | null
          created_at: string
          download_count: number
          expires_at: string
          id: string
          ip_hash: string | null
          visitor_email: string | null
        }
        Insert: {
          access_level?: string
          collection_id: string
          contact_id?: string | null
          created_at?: string
          download_count?: number
          expires_at?: string
          id?: string
          ip_hash?: string | null
          visitor_email?: string | null
        }
        Update: {
          access_level?: string
          collection_id?: string
          contact_id?: string | null
          created_at?: string
          download_count?: number
          expires_at?: string
          id?: string
          ip_hash?: string | null
          visitor_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sessions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sessions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_contacts: {
        Row: {
          assigned_at: string
          collection_id: string
          contact_id: string
        }
        Insert: {
          assigned_at?: string
          collection_id: string
          contact_id: string
        }
        Update: {
          assigned_at?: string
          collection_id?: string
          contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_contacts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_contacts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          background_color: string | null
          client_password_hash: string | null
          color_palette: string
          cover_focal_x: number | null
          cover_focal_y: number | null
          cover_photo_id: string | null
          cover_style: Database["public"]["Enums"]["cover_style"]
          cover_url: string | null
          cover_video_embed: string | null
          created_at: string
          download_limit_contact: number | null
          download_limit_gallery: number | null
          download_pin_hash: string | null
          download_resolutions: Database["public"]["Enums"]["download_resolution"][]
          downloads_enabled: boolean
          email_capture_enabled: boolean
          event_date: string | null
          favorites_allow_comments: boolean
          favorites_enabled: boolean
          folder_id: string | null
          font_family: string
          gallery_assist: boolean
          gallery_photo_sort: string
          grid_spacing: Database["public"]["Enums"]["grid_spacing"]
          grid_style: Database["public"]["Enums"]["grid_style"]
          guest_password_hash: string | null
          id: string
          is_starred: boolean
          language: string
          max_favorites: number | null
          name: string
          nav_style: Database["public"]["Enums"]["nav_style"]
          photo_count: number
          photographer_id: string
          position: number
          preset_id: string | null
          price_sheet_id: string | null
          privacy: Database["public"]["Enums"]["privacy_mode"]
          published_at: string | null
          show_filenames: boolean
          show_on_homepage: boolean
          slug: string
          social_sharing_enabled: boolean
          status: Database["public"]["Enums"]["collection_status"]
          store_banner_text: string | null
          store_enabled: boolean
          thumbnail_size: Database["public"]["Enums"]["thumbnail_size"]
          total_size_bytes: number
          updated_at: string
          video_count: number
          watermark_enabled: boolean
        }
        Insert: {
          background_color?: string | null
          client_password_hash?: string | null
          color_palette?: string
          cover_focal_x?: number | null
          cover_focal_y?: number | null
          cover_photo_id?: string | null
          cover_style?: Database["public"]["Enums"]["cover_style"]
          cover_url?: string | null
          cover_video_embed?: string | null
          created_at?: string
          download_limit_contact?: number | null
          download_limit_gallery?: number | null
          download_pin_hash?: string | null
          download_resolutions?: Database["public"]["Enums"]["download_resolution"][]
          downloads_enabled?: boolean
          email_capture_enabled?: boolean
          event_date?: string | null
          favorites_allow_comments?: boolean
          favorites_enabled?: boolean
          folder_id?: string | null
          font_family?: string
          gallery_assist?: boolean
          gallery_photo_sort?: string
          grid_spacing?: Database["public"]["Enums"]["grid_spacing"]
          grid_style?: Database["public"]["Enums"]["grid_style"]
          guest_password_hash?: string | null
          id?: string
          is_starred?: boolean
          language?: string
          max_favorites?: number | null
          name: string
          nav_style?: Database["public"]["Enums"]["nav_style"]
          photo_count?: number
          photographer_id: string
          position?: number
          preset_id?: string | null
          price_sheet_id?: string | null
          privacy?: Database["public"]["Enums"]["privacy_mode"]
          published_at?: string | null
          show_filenames?: boolean
          show_on_homepage?: boolean
          slug: string
          social_sharing_enabled?: boolean
          status?: Database["public"]["Enums"]["collection_status"]
          store_banner_text?: string | null
          store_enabled?: boolean
          thumbnail_size?: Database["public"]["Enums"]["thumbnail_size"]
          total_size_bytes?: number
          updated_at?: string
          video_count?: number
          watermark_enabled?: boolean
        }
        Update: {
          background_color?: string | null
          client_password_hash?: string | null
          color_palette?: string
          cover_focal_x?: number | null
          cover_focal_y?: number | null
          cover_photo_id?: string | null
          cover_style?: Database["public"]["Enums"]["cover_style"]
          cover_url?: string | null
          cover_video_embed?: string | null
          created_at?: string
          download_limit_contact?: number | null
          download_limit_gallery?: number | null
          download_pin_hash?: string | null
          download_resolutions?: Database["public"]["Enums"]["download_resolution"][]
          downloads_enabled?: boolean
          email_capture_enabled?: boolean
          event_date?: string | null
          favorites_allow_comments?: boolean
          favorites_enabled?: boolean
          folder_id?: string | null
          font_family?: string
          gallery_assist?: boolean
          gallery_photo_sort?: string
          grid_spacing?: Database["public"]["Enums"]["grid_spacing"]
          grid_style?: Database["public"]["Enums"]["grid_style"]
          guest_password_hash?: string | null
          id?: string
          is_starred?: boolean
          language?: string
          max_favorites?: number | null
          name?: string
          nav_style?: Database["public"]["Enums"]["nav_style"]
          photo_count?: number
          photographer_id?: string
          position?: number
          preset_id?: string | null
          price_sheet_id?: string | null
          privacy?: Database["public"]["Enums"]["privacy_mode"]
          published_at?: string | null
          show_filenames?: boolean
          show_on_homepage?: boolean
          slug?: string
          social_sharing_enabled?: boolean
          status?: Database["public"]["Enums"]["collection_status"]
          store_banner_text?: string | null
          store_enabled?: boolean
          thumbnail_size?: Database["public"]["Enums"]["thumbnail_size"]
          total_size_bytes?: number
          updated_at?: string
          video_count?: number
          watermark_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "collections_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cover_photo"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_price_sheet"
            columns: ["price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          photographer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          photographer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          photographer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          amount: number | null
          code: string
          coupon_type: Database["public"]["Enums"]["coupon_type"]
          created_at: string
          expires_at: string | null
          free_product_id: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          photographer_id: string
          uses_count: number
        }
        Insert: {
          amount?: number | null
          code: string
          coupon_type: Database["public"]["Enums"]["coupon_type"]
          created_at?: string
          expires_at?: string | null
          free_product_id?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          photographer_id: string
          uses_count?: number
        }
        Update: {
          amount?: number | null
          code?: string
          coupon_type?: Database["public"]["Enums"]["coupon_type"]
          created_at?: string
          expires_at?: string | null
          free_product_id?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          photographer_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_free_product_id_fkey"
            columns: ["free_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_registrations: {
        Row: {
          collection_id: string
          email: string
          id: string
          photographer_id: string
          registered_at: string
        }
        Insert: {
          collection_id: string
          email: string
          id?: string
          photographer_id: string
          registered_at?: string
        }
        Update: {
          collection_id?: string
          email?: string
          id?: string
          photographer_id?: string
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_registrations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_registrations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_registrations_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_items: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          list_id: string
          photo_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          list_id: string
          photo_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          list_id?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "favorite_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_lists: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          name: string
          session_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          name?: string
          session_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_lists_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_lists_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_lists_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "client_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          name: string
          photographer_id: string
          position: number
          show_on_homepage: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name: string
          photographer_id: string
          position?: number
          show_on_homepage?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name?: string
          photographer_id?: string
          position?: number
          show_on_homepage?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          initial_amount: number
          is_active: boolean
          photographer_id: string
          purchased_by_email: string | null
          remaining_amount: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          initial_amount: number
          is_active?: boolean
          photographer_id: string
          purchased_by_email?: string | null
          remaining_amount: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          initial_amount?: number
          is_active?: boolean
          photographer_id?: string
          purchased_by_email?: string | null
          remaining_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          base_cost: number | null
          download_expires_at: string | null
          download_url: string | null
          id: string
          options: Json | null
          order_id: string
          photo_id: string | null
          product_id: string | null
          product_name: string
          product_type: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          base_cost?: number | null
          download_expires_at?: string | null
          download_url?: string | null
          id?: string
          options?: Json | null
          order_id: string
          photo_id?: string | null
          product_id?: string | null
          product_name: string
          product_type: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          base_cost?: number | null
          download_expires_at?: string | null
          download_url?: string | null
          id?: string
          options?: Json | null
          order_id?: string
          photo_id?: string | null
          product_id?: string | null
          product_name?: string
          product_type?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          collection_id: string | null
          commission_amount: number
          coupon_id: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          delivered_at: string | null
          discount_amount: number
          fulfillment_type:
            | Database["public"]["Enums"]["fulfillment_type"]
            | null
          gift_card_amount_used: number
          gift_card_id: string | null
          id: string
          lab_order_id: string | null
          notes: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_provider: string | null
          photographer_id: string
          photographer_payout: number
          price_sheet_id: string | null
          session_id: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_amount: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          total: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          collection_id?: string | null
          commission_amount?: number
          coupon_id?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          delivered_at?: string | null
          discount_amount?: number
          fulfillment_type?:
            | Database["public"]["Enums"]["fulfillment_type"]
            | null
          gift_card_amount_used?: number
          gift_card_id?: string | null
          id?: string
          lab_order_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          photographer_id: string
          photographer_payout?: number
          price_sheet_id?: string | null
          session_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          collection_id?: string | null
          commission_amount?: number
          coupon_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          delivered_at?: string | null
          discount_amount?: number
          fulfillment_type?:
            | Database["public"]["Enums"]["fulfillment_type"]
            | null
          gift_card_amount_used?: number
          gift_card_id?: string | null
          id?: string
          lab_order_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          photographer_id?: string
          photographer_payout?: number
          price_sheet_id?: string | null
          session_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_price_sheet_id_fkey"
            columns: ["price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "client_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      package_items: {
        Row: {
          id: string
          package_id: string
          product_id: string
          quantity: number
          single_image_restriction: boolean
        }
        Insert: {
          id?: string
          package_id: string
          product_id: string
          quantity?: number
          single_image_restriction?: boolean
        }
        Update: {
          id?: string
          package_id?: string
          product_id?: string
          quantity?: number
          single_image_restriction?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      photographers: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_domain: string | null
          default_language: string
          display_name: string
          email: string
          ga_tracking_id: string | null
          homepage_enabled: boolean
          homepage_slug: string | null
          id: string
          logo_storage_path: string | null
          logo_url: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          storage_used_bytes: number
          updated_at: string
          watermark_opacity: number
          watermark_position: Database["public"]["Enums"]["watermark_position"]
          watermark_storage_path: string | null
          watermark_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_domain?: string | null
          default_language?: string
          display_name?: string
          email: string
          ga_tracking_id?: string | null
          homepage_enabled?: boolean
          homepage_slug?: string | null
          id: string
          logo_storage_path?: string | null
          logo_url?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          storage_used_bytes?: number
          updated_at?: string
          watermark_opacity?: number
          watermark_position?: Database["public"]["Enums"]["watermark_position"]
          watermark_storage_path?: string | null
          watermark_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_domain?: string | null
          default_language?: string
          display_name?: string
          email?: string
          ga_tracking_id?: string | null
          homepage_enabled?: boolean
          homepage_slug?: string | null
          id?: string
          logo_storage_path?: string | null
          logo_url?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          storage_used_bytes?: number
          updated_at?: string
          watermark_opacity?: number
          watermark_position?: Database["public"]["Enums"]["watermark_position"]
          watermark_storage_path?: string | null
          watermark_url?: string | null
        }
        Relationships: []
      }
      photos: {
        Row: {
          collection_id: string
          created_at: string
          exif_camera: string | null
          exif_lens: string | null
          exif_taken_at: string | null
          filename: string
          full_url: string | null
          height: number | null
          id: string
          is_private: boolean
          is_starred: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          mime_type: string | null
          original_storage_path: string | null
          photographer_id: string
          position: number
          set_id: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["media_status"]
          thumbnail_storage_path: string | null
          thumbnail_url: string | null
          updated_at: string
          watermarked_storage_path: string | null
          watermarked_url: string | null
          web_storage_path: string | null
          web_url: string | null
          width: number | null
        }
        Insert: {
          collection_id: string
          created_at?: string
          exif_camera?: string | null
          exif_lens?: string | null
          exif_taken_at?: string | null
          filename: string
          full_url?: string | null
          height?: number | null
          id?: string
          is_private?: boolean
          is_starred?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          mime_type?: string | null
          original_storage_path?: string | null
          photographer_id: string
          position?: number
          set_id?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["media_status"]
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          watermarked_storage_path?: string | null
          watermarked_url?: string | null
          web_storage_path?: string | null
          web_url?: string | null
          width?: number | null
        }
        Update: {
          collection_id?: string
          created_at?: string
          exif_camera?: string | null
          exif_lens?: string | null
          exif_taken_at?: string | null
          filename?: string
          full_url?: string | null
          height?: number | null
          id?: string
          is_private?: boolean
          is_starred?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          mime_type?: string | null
          original_storage_path?: string | null
          photographer_id?: string
          position?: number
          set_id?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["media_status"]
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          watermarked_storage_path?: string | null
          watermarked_url?: string | null
          web_storage_path?: string | null
          web_url?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
        ]
      }
      presets: {
        Row: {
          created_at: string
          id: string
          name: string
          photographer_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photographer_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photographer_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presets_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      price_sheets: {
        Row: {
          commission_rate: number
          created_at: string
          currency: string
          digital_license: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          is_default: boolean
          name: string
          photographer_id: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          currency?: string
          digital_license?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          is_default?: boolean
          name: string
          photographer_id: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          currency?: string
          digital_license?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          is_default?: boolean
          name?: string
          photographer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_sheets_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_cost: number | null
          created_at: string
          description: string | null
          download_resolution:
            | Database["public"]["Enums"]["download_resolution"]
            | null
          download_type: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          is_visible: boolean
          lab_product_code: string | null
          limit_one_per_checkout: boolean
          name: string
          options: Json | null
          photographer_id: string
          position: number
          price: number
          price_sheet_id: string
          product_type: string
          updated_at: string
        }
        Insert: {
          base_cost?: number | null
          created_at?: string
          description?: string | null
          download_resolution?:
            | Database["public"]["Enums"]["download_resolution"]
            | null
          download_type?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          is_visible?: boolean
          lab_product_code?: string | null
          limit_one_per_checkout?: boolean
          name: string
          options?: Json | null
          photographer_id: string
          position?: number
          price: number
          price_sheet_id: string
          product_type: string
          updated_at?: string
        }
        Update: {
          base_cost?: number | null
          created_at?: string
          description?: string | null
          download_resolution?:
            | Database["public"]["Enums"]["download_resolution"]
            | null
          download_type?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          is_visible?: boolean
          lab_product_code?: string | null
          limit_one_per_checkout?: boolean
          name?: string
          options?: Json | null
          photographer_id?: string
          position?: number
          price?: number
          price_sheet_id?: string
          product_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_price_sheet_id_fkey"
            columns: ["price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          collection_id: string
          created_at: string
          description: string | null
          id: string
          is_private: boolean
          name: string
          photo_count: number
          photographer_id: string
          position: number
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          photo_count?: number
          photographer_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          photo_count?: number
          photographer_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      collections_public: {
        Row: {
          background_color: string | null
          color_palette: string | null
          cover_focal_x: number | null
          cover_focal_y: number | null
          cover_style: Database["public"]["Enums"]["cover_style"] | null
          cover_url: string | null
          cover_video_embed: string | null
          download_resolutions:
            | Database["public"]["Enums"]["download_resolution"][]
            | null
          downloads_enabled: boolean | null
          email_capture_enabled: boolean | null
          event_date: string | null
          favorites_enabled: boolean | null
          folder_id: string | null
          font_family: string | null
          gallery_assist: boolean | null
          grid_spacing: Database["public"]["Enums"]["grid_spacing"] | null
          grid_style: Database["public"]["Enums"]["grid_style"] | null
          id: string | null
          language: string | null
          name: string | null
          nav_style: Database["public"]["Enums"]["nav_style"] | null
          photo_count: number | null
          photographer_id: string | null
          photographer_logo_url: string | null
          photographer_name: string | null
          photographer_slug: string | null
          privacy: Database["public"]["Enums"]["privacy_mode"] | null
          published_at: string | null
          show_on_homepage: boolean | null
          slug: string | null
          social_sharing_enabled: boolean | null
          status: Database["public"]["Enums"]["collection_status"] | null
          store_banner_text: string | null
          store_enabled: boolean | null
          thumbnail_size: Database["public"]["Enums"]["thumbnail_size"] | null
          video_count: number | null
          watermark_enabled: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      activity_type:
        | "gallery_view"
        | "download"
        | "favorite_add"
        | "favorite_remove"
        | "email_register"
        | "password_attempt"
        | "store_view"
        | "cart_add"
      collection_status: "draft" | "published" | "archived"
      coupon_type:
        | "percent_off"
        | "amount_off"
        | "free_shipping"
        | "free_product"
      cover_style: "photo" | "video_embed" | "solid_color" | "text_only"
      download_resolution: "web" | "full" | "original"
      fulfillment_type: "automatic" | "self" | "digital"
      grid_spacing: "tight" | "regular" | "large"
      grid_style: "vertical" | "horizontal" | "masonry"
      media_status: "uploading" | "processing" | "ready" | "error"
      media_type: "image" | "video" | "gif" | "raw" | "png"
      nav_style: "icons" | "icons_labels"
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "fulfilled"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      plan_tier: "free" | "basic" | "plus" | "pro" | "ultimate"
      privacy_mode: "public" | "password" | "client_exclusive"
      thumbnail_size: "regular" | "large"
      watermark_position:
        | "center"
        | "top_left"
        | "top_right"
        | "bottom_left"
        | "bottom_right"
        | "tile"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
