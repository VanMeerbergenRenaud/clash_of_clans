export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            base_link: {
                Row: {
                    id: number
                    created_at: string
                    name: string | null
                    link: string
                    th: number
                    type: string | null
                    user_id: string | null
                }
                Insert: {
                    id?: number
                    created_at?: string
                    name?: string | null
                    link: string
                    th: number
                    type?: string | null
                    user_id?: string | null
                }
                Update: {
                    id?: number
                    created_at?: string
                    name?: string | null
                    link?: string
                    th?: number
                    type?: string | null
                    user_id?: string | null
                }
            }
            strategies: {
                Row: {
                    id: string
                    created_at: string
                    title: string
                    description: string | null
                    type: string
                    min_town_hall: number
                    army_link: string | null
                    video_url: string | null
                    user_id: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    title: string
                    description?: string | null
                    type: string
                    min_town_hall: number
                    army_link?: string | null
                    video_url?: string | null
                    user_id?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    title?: string
                    description?: string | null
                    type?: string
                    min_town_hall?: number
                    army_link?: string | null
                    video_url?: string | null
                    user_id?: string | null
                }
            }
            tracked_clans: {
                Row: {
                    ordered: number
                    created_at: string
                    name: string
                    tag: string
                }
                Insert: {
                    ordered: number
                    created_at?: string
                    name: string
                    tag: string
                }
                Update: {
                    ordered?: number
                    created_at?: string
                    name?: string
                    tag?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                    user_type: string | null
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    user_type?: string | null
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    user_type?: string | null
                }
            }
            wars: {
                Row: {
                    id: number
                    created_at?: string
                    end_date: string
                    team_size: number
                    clan_tag: string
                    clan_name: string
                    clan_stars: number
                    clan_destruction: number
                    opponent_tag: string
                    opponent_name: string
                    opponent_stars: number
                    opponent_destruction: number
                    result: string | null
                }
                Insert: {
                    id?: number
                    created_at?: string
                    end_date: string
                    team_size: number
                    clan_tag: string
                    clan_name: string
                    clan_stars: number
                    clan_destruction: number
                    opponent_tag: string
                    opponent_name: string
                    opponent_stars: number
                    opponent_destruction: number
                    result?: string | null
                }
                Update: {
                    id?: number
                    created_at?: string
                    end_date?: string
                    team_size?: number
                    clan_tag?: string
                    clan_name?: string
                    clan_stars?: number
                    clan_destruction?: number
                    opponent_tag?: string
                    opponent_name?: string
                    opponent_stars?: number
                    opponent_destruction?: number
                    result?: string | null
                }
            }
            league_history: {
                Row: {
                    id: number
                    created_at: string
                    clan_tag: string | null
                    season: string | null
                    league_name: string | null
                    rank: number | null
                    stars: number | null
                    destruction_percentage: number | null
                    result: string | null
                }
                Insert: {
                    id?: number
                    created_at?: string
                    clan_tag?: string | null
                    season?: string | null
                    league_name?: string | null
                    rank?: number | null
                    stars?: number | null
                    destruction_percentage?: number | null
                    result?: string | null
                }
                Update: {
                    id?: number
                    created_at?: string
                    clan_tag?: string | null
                    season?: string | null
                    league_name?: string | null
                    rank?: number | null
                    stars?: number | null
                    destruction_percentage?: number | null
                    result?: string | null
                }
            }
        }
    }
}
