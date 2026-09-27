
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "exercises": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"muscle_group": string,"name": string,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"muscle_group": string,"name": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"muscle_group"?: string,"name"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"email": string,"id": string,"timezone": string,"unit": string,"updated_at": string,"weekly_workout_goal": number
                  }
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"email": string,"id": string,"timezone"?: string,"unit"?: string,"updated_at"?: string,"weekly_workout_goal"?: number
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"email"?: string,"id"?: string,"timezone"?: string,"unit"?: string,"updated_at"?: string,"weekly_workout_goal"?: number
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_used_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_used_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_used_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reminder_events": {
                  Row: {
                    "created_at": string,"delivered_via": (string)[],"error": string | null,"id": number,"occurrence_date": string,"reminder_id": string,"stage": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"delivered_via"?: (string)[],"error"?: string | null,"id"?: never,"occurrence_date": string,"reminder_id": string,"stage": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"delivered_via"?: (string)[],"error"?: string | null,"id"?: never,"occurrence_date"?: string,"reminder_id"?: string,"stage"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminder_events_reminder_id_fkey"
      columns: ["reminder_id"]
isOneToOne: false
      referencedRelation: "reminders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminder_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reminders": {
                  Row: {
                    "channel": string,"created_at": string,"enabled": boolean,"follow_up_minutes": number | null,"id": string,"kind": string,"label": string | null,"time_of_day": string,"todo_id": string | null,"updated_at": string,"user_id": string,"weekdays": (number)[]
                  }
                  Insert: {
                    "channel"?: string,"created_at"?: string,"enabled"?: boolean,"follow_up_minutes"?: number | null,"id"?: string,"kind": string,"label"?: string | null,"time_of_day": string,"todo_id"?: string | null,"updated_at"?: string,"user_id"?: string,"weekdays"?: (number)[]
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"enabled"?: boolean,"follow_up_minutes"?: number | null,"id"?: string,"kind"?: string,"label"?: string | null,"time_of_day"?: string,"todo_id"?: string | null,"updated_at"?: string,"user_id"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminders_todo_id_user_id_fkey"
      columns: ["todo_id","user_id"]
isOneToOne: false
      referencedRelation: "todos"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "reminders_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"routine_exercises": {
                  Row: {
                    "exercise_id": string,"id": string,"position": number,"rest_seconds": number,"routine_id": string,"target_reps": number | null,"target_sets": number,"user_id": string
                  }
                  Insert: {
                    "exercise_id": string,"id"?: string,"position": number,"rest_seconds"?: number,"routine_id": string,"target_reps"?: number | null,"target_sets"?: number,"user_id"?: string
                  }
                  Update: {
                    "exercise_id"?: string,"id"?: string,"position"?: number,"rest_seconds"?: number,"routine_id"?: string,"target_reps"?: number | null,"target_sets"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "routine_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "routine_exercises_routine_id_user_id_fkey"
      columns: ["routine_id","user_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"routines": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"notes": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"notes"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"notes"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "routines_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"todo_completions": {
                  Row: {
                    "completed_at": string,"occurrence_date": string,"todo_id": string,"user_id": string
                  }
                  Insert: {
                    "completed_at"?: string,"occurrence_date": string,"todo_id": string,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string,"occurrence_date"?: string,"todo_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "todo_completions_todo_id_user_id_fkey"
      columns: ["todo_id","user_id"]
isOneToOne: false
      referencedRelation: "todos"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"todos": {
                  Row: {
                    "active": boolean,"created_at": string,"due_date": string | null,"id": string,"month_day": number | null,"notes": string | null,"schedule": string,"title": string,"updated_at": string,"user_id": string,"weekdays": (number)[] | null
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"due_date"?: string | null,"id"?: string,"month_day"?: number | null,"notes"?: string | null,"schedule": string,"title": string,"updated_at"?: string,"user_id"?: string,"weekdays"?: (number)[] | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"due_date"?: string | null,"id"?: string,"month_day"?: number | null,"notes"?: string | null,"schedule"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string,"weekdays"?: (number)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "todos_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"weight_entries": {
                  Row: {
                    "created_at": string,"entry_date": string,"id": string,"note": string | null,"updated_at": string,"user_id": string,"weight_kg": number
                  }
                  Insert: {
                    "created_at"?: string,"entry_date": string,"id"?: string,"note"?: string | null,"updated_at"?: string,"user_id"?: string,"weight_kg": number
                  }
                  Update: {
                    "created_at"?: string,"entry_date"?: string,"id"?: string,"note"?: string | null,"updated_at"?: string,"user_id"?: string,"weight_kg"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "weight_entries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_sets": {
                  Row: {
                    "created_at": string,"distance_m": number | null,"duration_seconds": number | null,"exercise_id": string,"exercise_position": number,"id": string,"is_pr": boolean,"is_warmup": boolean,"reps": number | null,"set_number": number,"user_id": string,"weight_kg": number | null,"workout_id": string
                  }
                  Insert: {
                    "created_at"?: string,"distance_m"?: number | null,"duration_seconds"?: number | null,"exercise_id": string,"exercise_position": number,"id"?: string,"is_pr"?: boolean,"is_warmup"?: boolean,"reps"?: number | null,"set_number": number,"user_id"?: string,"weight_kg"?: number | null,"workout_id": string
                  }
                  Update: {
                    "created_at"?: string,"distance_m"?: number | null,"duration_seconds"?: number | null,"exercise_id"?: string,"exercise_position"?: number,"id"?: string,"is_pr"?: boolean,"is_warmup"?: boolean,"reps"?: number | null,"set_number"?: number,"user_id"?: string,"weight_kg"?: number | null,"workout_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_sets_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_sets_workout_id_user_id_fkey"
      columns: ["workout_id","user_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"workouts": {
                  Row: {
                    "created_at": string,"ended_at": string | null,"id": string,"name": string,"notes": string | null,"routine_id": string | null,"started_at": string | null,"updated_at": string,"user_id": string,"workout_date": string
                  }
                  Insert: {
                    "created_at"?: string,"ended_at"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"routine_id"?: string | null,"started_at"?: string | null,"updated_at"?: string,"user_id"?: string,"workout_date": string
                  }
                  Update: {
                    "created_at"?: string,"ended_at"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"routine_id"?: string | null,"started_at"?: string | null,"updated_at"?: string,"user_id"?: string,"workout_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_routine_id_user_id_fkey"
      columns: ["routine_id","user_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "workouts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_use_exercise":
{ Args: { "p_exercise_id": string }; Returns: boolean
                           },
"exercise_snapshot":
{ Args: { "p_exclude_workout"?: string,"p_exercise_ids": (string)[] }; Returns: {
              "best_distance_m": number,"best_duration_seconds": number,"best_e1rm_kg": number,"best_reps": number,"best_weight_kg": number,"exercise_id": string,"last_date": string,"last_sets": Json
            }[]
                           },
"is_valid_timezone":
{ Args: { "tz": string }; Returns: boolean
                           },
"save_routine":
{ Args: { "p_exercises": Json,"p_routine": Json }; Returns: string
                           },
"save_workout":
{ Args: { "p_sets": Json,"p_workout": Json }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

