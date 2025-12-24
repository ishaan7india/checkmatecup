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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      champions: {
        Row: {
          created_at: string
          first_place_id: string | null
          id: string
          published: boolean | null
          second_place_id: string | null
          third_place_id: string | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          first_place_id?: string | null
          id?: string
          published?: boolean | null
          second_place_id?: string | null
          third_place_id?: string | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          first_place_id?: string | null
          id?: string
          published?: boolean | null
          second_place_id?: string | null
          third_place_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "champions_first_place_id_fkey"
            columns: ["first_place_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "champions_second_place_id_fkey"
            columns: ["second_place_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "champions_third_place_id_fkey"
            columns: ["third_place_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "champions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          black_player_id: string
          black_ready: boolean | null
          black_time_remaining: number | null
          created_at: string
          draw_offered_by: string | null
          ended_at: string | null
          fen: string | null
          id: string
          pgn: string | null
          result: Database["public"]["Enums"]["game_result"] | null
          round: number
          started_at: string | null
          tournament_id: string
          white_player_id: string
          white_ready: boolean | null
          white_time_remaining: number | null
        }
        Insert: {
          black_player_id: string
          black_ready?: boolean | null
          black_time_remaining?: number | null
          created_at?: string
          draw_offered_by?: string | null
          ended_at?: string | null
          fen?: string | null
          id?: string
          pgn?: string | null
          result?: Database["public"]["Enums"]["game_result"] | null
          round: number
          started_at?: string | null
          tournament_id: string
          white_player_id: string
          white_ready?: boolean | null
          white_time_remaining?: number | null
        }
        Update: {
          black_player_id?: string
          black_ready?: boolean | null
          black_time_remaining?: number | null
          created_at?: string
          draw_offered_by?: string | null
          ended_at?: string | null
          fen?: string | null
          id?: string
          pgn?: string | null
          result?: Database["public"]["Enums"]["game_result"] | null
          round?: number
          started_at?: string | null
          tournament_id?: string
          white_player_id?: string
          white_ready?: boolean | null
          white_time_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_black_player_id_fkey"
            columns: ["black_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_white_player_id_fkey"
            columns: ["white_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_initials: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          games_drawn: number | null
          games_lost: number | null
          games_played: number | null
          games_won: number | null
          id: string
          rank: number | null
          rating: number | null
          score: number | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_initials?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name: string
          games_drawn?: number | null
          games_lost?: number | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          rank?: number | null
          rating?: number | null
          score?: number | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_initials?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          games_drawn?: number | null
          games_lost?: number | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          rank?: number | null
          rating?: number | null
          score?: number | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      tournament_players: {
        Row: {
          buchholz: number | null
          id: string
          is_eliminated: boolean | null
          player_id: string
          rank: number | null
          registered_at: string
          score: number | null
          sonneborg_berger: number | null
          tournament_id: string
        }
        Insert: {
          buchholz?: number | null
          id?: string
          is_eliminated?: boolean | null
          player_id: string
          rank?: number | null
          registered_at?: string
          score?: number | null
          sonneborg_berger?: number | null
          tournament_id: string
        }
        Update: {
          buchholz?: number | null
          id?: string
          is_eliminated?: boolean | null
          player_id?: string
          rank?: number | null
          registered_at?: string
          score?: number | null
          sonneborg_berger?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          current_round: number | null
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          name: string
          status: Database["public"]["Enums"]["tournament_status"]
          time_control: string
          total_rounds: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_round?: number | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          time_control?: string
          total_rounds?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_round?: number | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          time_control?: string
          total_rounds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_avatar_initials: { Args: { full_name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "player"
      game_result:
        | "white_wins"
        | "black_wins"
        | "draw"
        | "pending"
        | "in_progress"
      tournament_format:
        | "swiss"
        | "knockouts"
        | "round_robin_playoffs"
        | "swiss_playoffs"
        | "swiss_super_league"
        | "arena"
      tournament_status: "registration" | "in_progress" | "completed"
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

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "player"],
      game_result: [
        "white_wins",
        "black_wins",
        "draw",
        "pending",
        "in_progress",
      ],
      tournament_format: [
        "swiss",
        "knockouts",
        "round_robin_playoffs",
        "swiss_playoffs",
        "swiss_super_league",
        "arena",
      ],
      tournament_status: ["registration", "in_progress", "completed"],
    },
  },
} as const
