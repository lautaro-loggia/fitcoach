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
            assigned_diets: {
                Row: {
                    client_id: string
                    created_at: string | null
                    data: Json | null
                    id: string
                    is_customized: boolean | null
                    name: string | null
                    origin_template_id: string | null
                    trainer_id: string
                }
                Insert: {
                    client_id: string
                    created_at?: string | null
                    data?: Json | null
                    id?: string
                    is_customized?: boolean | null
                    name?: string | null
                    origin_template_id?: string | null
                    trainer_id: string
                }
                Update: {
                    client_id?: string
                    created_at?: string | null
                    data?: Json | null
                    id?: string
                    is_customized?: boolean | null
                    name?: string | null
                    origin_template_id?: string | null
                    trainer_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "assigned_diets_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "assigned_diets_origin_template_id_fkey"
                        columns: ["origin_template_id"]
                        isOneToOne: false
                        referencedRelation: "recipes"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "assigned_diets_trainer_id_fkey"
                        columns: ["trainer_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            assigned_workouts: {
                Row: {
                    client_id: string
                    created_at: string | null
                    id: string
                    is_customized: boolean | null
                    name: string | null
                    origin_template_id: string | null
                    structure: Json | null
                    trainer_id: string
                }
                Insert: {
                    client_id: string
                    created_at?: string | null
                    id?: string
                    is_customized?: boolean | null
                    name?: string | null
                    origin_template_id?: string | null
                    structure?: Json | null
                    trainer_id: string
                }
                Update: {
                    client_id?: string
                    created_at?: string | null
                    id?: string
                    is_customized?: boolean | null
                    name?: string | null
                    origin_template_id?: string | null
                    structure?: Json | null
                    trainer_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "assigned_workouts_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "assigned_workouts_origin_template_id_fkey"
                        columns: [
                            "origin_template_id"
                        ]
                        isOneToOne: false
                        referencedRelation: "workouts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "assigned_workouts_trainer_id_fkey"
                        columns: ["trainer_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            checkins: {
                Row: {
                    body_fat: number | null
                    client_id: string
                    created_at: string | null
                    date: string
                    id: string
                    lean_mass: number | null
                    measurements: Json | null
                    observations: string | null
                    photos: string[] | null
                    trainer_id: string | null
                    weight: number | null
                }
                Insert: {
                    body_fat?: number | null
                    client_id: string
                    created_at?: string | null
                    date?: string
                    id?: string
                    lean_mass?: number | null
                    measurements?: Json | null
                    observations?: string | null
                    photos?: string[] | null
                    trainer_id?: string | null
                    weight?: number | null
                }
                Update: {
                    body_fat?: number | null
                    client_id?: string
                    created_at?: string | null
                    date?: string
                    id?: string
                    lean_mass?: number | null
                    measurements?: Json | null
                    observations?: string | null
                    photos?: string[] | null
                    trainer_id?: string | null
                    weight?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "checkins_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "checkins_trainer_id_fkey"
                        columns: ["trainer_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            clients: {
                Row: {
                    activity_level: string | null
                    birth_date: string | null
                    created_at: string | null
                    current_weight: number | null
                    deleted_at: string | null
                    dietary_info: Json | null
                    email: string | null
                    full_name: string
                    gender: string | null
                    goal_specific: string | null
                    goal_text: string | null
                    height: number | null
                    id: string
                    initial_body_fat: number | null
                    initial_weight: number | null
                    injuries: Json | null
                    main_goal: string | null
                    onboarding_status: string | null
                    phone: string | null
                    planning_status: string | null
                    status: string | null
                    target_fat: number | null
                    target_weight: number | null
                    trainer_id: string
                    training_availability: Json | null
                    updated_at: string | null
                    user_id: string | null
                    work_type: string | null
                }
                Insert: {
                    activity_level?: string | null
                    birth_date?: string | null
                    created_at?: string | null
                    current_weight?: number | null
                    deleted_at?: string | null
                    dietary_info?: Json | null
                    email?: string | null
                    full_name: string
                    gender?: string | null
                    goal_specific?: string | null
                    goal_text?: string | null
                    height?: number | null
                    id?: string
                    initial_body_fat?: number | null
                    initial_weight?: number | null
                    injuries?: Json | null
                    main_goal?: string | null
                    onboarding_status?: string | null
                    phone?: string | null
                    planning_status?: string | null
                    status?: string | null
                    target_fat?: number | null
                    target_weight?: number | null
                    trainer_id: string
                    training_availability?: Json | null
                    updated_at?: string | null
                    user_id?: string | null
                    work_type?: string | null
                }
                Update: {
                    activity_level?: string | null
                    birth_date?: string | null
                    created_at?: string | null
                    current_weight?: number | null
                    deleted_at?: string | null
                    dietary_info?: Json | null
                    email?: string | null
                    full_name?: string
                    gender?: string | null
                    goal_specific?: string | null
                    goal_text?: string | null
                    height?: number | null
                    id?: string
                    initial_body_fat?: number | null
                    initial_weight?: number | null
                    injuries?: Json | null
                    main_goal?: string | null
                    onboarding_status?: string | null
                    phone?: string | null
                    planning_status?: string | null
                    status?: string | null
                    target_fat?: number | null
                    target_weight?: number | null
                    trainer_id?: string
                    training_availability?: Json | null
                    updated_at?: string | null
                    user_id?: string | null
                    work_type?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "clients_trainer_id_fkey"
                        columns: ["trainer_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            ingredients: {
                Row: {
                    carbs_100g: number | null
                    category: string | null
                    created_at: string | null
                    fat_100g: number | null
                    fiber_100g: number | null
                    id: string
                    kcal_100g: number | null
                    name: string
                    notes: string | null
                    protein_100g: number | null
                    state: string | null
                    trainer_id: string | null
                }
                Insert: {
                    carbs_100g?: number | null
                    category?: string | null
                    created_at?: string | null
                    fat_100g?: number | null
                    fiber_100g?: number | null
                    id?: string
                    kcal_100g?: number | null
                    name: string
                    notes?: string | null
                    protein_100g?: number | null
                    state?: string | null
                    trainer_id?: string | null
                }
                Update: {
                    carbs_100g?: number | null
                    category?: string | null
                    created_at?: string | null
                    fat_100g?: number | null
                    fiber_100g?: number | null
                    id?: string
                    kcal_100g?: number | null
                    name?: string
                    notes?: string | null
                    protein_100g?: number | null
                    state?: string | null
                    trainer_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "ingredients_trainer_id_fkey"
                        columns: ["trainer_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            payments: {
                Row: {
                    amount: number
                    client_id: string
                    created_at: string | null
                    due_date: string
                    id: string
                    paid_date: string | null
                    status: string | null
                    trainer_id: string
                }
                Insert: {
                    amount: number
                    client_id: string
                    created_at?: string | null
                    due_date: string
                    id?: string
                    paid_date?: string | null
                    status?: string | null
                    trainer_id: string
                }
                Update: {
                    amount?: number
                    client_id?: string
                    created_at?: string | null
                    due_date?: string
                    id?: string
                    paid_date?: string | null
                    status?: string | null
                    trainer_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "payments_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "payments_trainer_id_fkey"
                        columns: ["trainer_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    created_at: string | null
                    email: string | null
                    full_name: string | null
                    id: string
                }
                Insert: {
                    created_at?: string | null
                    email?: string | null
                    full_name?: string | null
                    id: string
                }
                Update: {
                    created_at?: string | null
                    email?: string | null
                    full_name?: string | null
                    id?: string
                }
                Relationships: []
            }
            recipes: {
                Row: {
                    created_at: string | null
                    description: string | null
                    id: string
                    ingredients: Json | null
                    name: string
                    total_calories: number | null
                    total_carbs: number | null
                    total_fats: number | null
                    total_proteins: number | null
                    trainer_id: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    ingredients?: Json | null
                    name: string
                    total_calories?: number | null
                    total_carbs?: number | null
                    total_fats?: number | null
                    total_proteins?: number | null
                    trainer_id: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    ingredients?: Json | null
                    name?: string
                    total_calories?: number | null
                    total_carbs?: number | null
                    total_fats?: number | null
                    total_proteins?: number | null
                    trainer_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "recipes_trainer_id_fkey"
                        columns: ["trainer_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            workouts: {
                Row: {
                    created_at: string | null
                    days_count: number | null
                    description: string | null
                    id: string
                    name: string
                    structure: Json | null
                    trainer_id: string
                }
                Insert: {
                    created_at?: string | null
                    days_count?: number | null
                    description?: string | null
                    id?: string
                    name: string
                    structure?: Json | null
                    trainer_id: string
                }
                Update: {
                    created_at?: string | null
                    days_count?: number | null
                    description?: string | null
                    id?: string
                    name?: string
                    structure?: Json | null
                    trainer_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "workouts_trainer_id_fkey"
                        columns: ["trainer_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}




type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    T extends keyof PublicSchema["Tables"] | { schema: keyof Database } = keyof PublicSchema["Tables"]
> = T extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][T]["Row"]
    : any

export type TablesInsert<
    T extends keyof PublicSchema["Tables"] | { schema: keyof Database } = keyof PublicSchema["Tables"]
> = T extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][T]["Insert"]
    : any

export type TablesUpdate<
    T extends keyof PublicSchema["Tables"] | { schema: keyof Database } = keyof PublicSchema["Tables"]
> = T extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][T]["Update"]
    : any

export type Enums<
    T extends keyof PublicSchema["Enums"] | { schema: keyof Database } = keyof PublicSchema["Enums"]
> = T extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][T]
    : any

export type CompositeTypes<
    T extends keyof PublicSchema["CompositeTypes"] | { schema: keyof Database } = keyof PublicSchema["CompositeTypes"]
> = T extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][T]
    : any

