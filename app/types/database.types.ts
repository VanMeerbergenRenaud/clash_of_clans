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
                    image_url: string | null
                    description: string | null
                }
                Insert: {
                    id?: number
                    created_at?: string
                    name?: string | null
                    link: string
                    th: number
                    type?: string | null
                    image_url?: string | null
                    description?: string | null
                }
                Update: {
                    id?: number
                    created_at?: string
                    name?: string | null
                    link?: string
                    th?: number
                    type?: string | null
                    image_url?: string | null
                    description?: string | null
                }
            }
            cron_logs: {
                Row: {
                    id: number
                    task_name: string
                    status: string
                    message: string | null
                    items_count: number
                    created_at: string
                }
                Insert: {
                    id?: number
                    task_name: string
                    status: string
                    message?: string | null
                    items_count?: number
                    created_at?: string
                }
                Update: {
                    id?: number
                    task_name?: string
                    status?: string
                    message?: string | null
                    items_count?: number
                    created_at?: string
                }
            }
            inscription_members: {
                Row: {
                    id: string
                    inscription_id: string
                    player_tag: string
                    player_name: string | null
                    clan_tag: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    inscription_id: string
                    player_tag: string
                    player_name?: string | null
                    clan_tag?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    inscription_id?: string
                    player_tag?: string
                    player_name?: string | null
                    clan_tag?: string | null
                    created_at?: string
                }
            }
            inscriptions: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
            }
            league_clans: {
                Row: {
                    id: string
                    league_history_id: string
                    clan_tag: string
                    clan_name: string
                    clan_level: number | null
                    badge_url: string | null
                    group_rank: number | null
                    total_stars: number
                    total_destruction: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    league_history_id: string
                    clan_tag: string
                    clan_name: string
                    clan_level?: number | null
                    badge_url?: string | null
                    group_rank?: number | null
                    total_stars?: number
                    total_destruction?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    league_history_id?: string
                    clan_tag?: string
                    clan_name?: string
                    clan_level?: number | null
                    badge_url?: string | null
                    group_rank?: number | null
                    total_stars?: number
                    total_destruction?: number
                    created_at?: string
                }
            }
            league_history: {
                Row: {
                    id: string
                    season: string
                    clan_tag: string
                    clan_name: string
                    league_name: string | null
                    league_id: number | null
                    final_rank: number | null
                    total_stars: number
                    total_destruction: number
                    result: 'promoted' | 'demoted' | 'stayed' | null
                    state: 'inProgress' | 'ended'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    season: string
                    clan_tag: string
                    clan_name: string
                    league_name?: string | null
                    league_id?: number | null
                    final_rank?: number | null
                    total_stars?: number
                    total_destruction?: number
                    result?: 'promoted' | 'demoted' | 'stayed' | null
                    state?: 'inProgress' | 'ended'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    season?: string
                    clan_tag?: string
                    clan_name?: string
                    league_name?: string | null
                    league_id?: number | null
                    final_rank?: number | null
                    total_stars?: number
                    total_destruction?: number
                    result?: 'promoted' | 'demoted' | 'stayed' | null
                    state?: 'inProgress' | 'ended'
                    created_at?: string
                    updated_at?: string
                }
            }
            league_participants: {
                Row: {
                    id: string
                    league_history_id: string
                    player_tag: string
                    player_name: string
                    town_hall_level: number | null
                    total_stars: number
                    total_destruction: number
                    attacks_used: number
                    map_position: number | null
                    daily_attacks: Json
                    created_at: string
                    updated_at: string
                    defense_stars: number | null
                    defense_destruction: number | null
                    defense_attacker_tag: string | null
                }
                Insert: {
                    id?: string
                    league_history_id: string
                    player_tag: string
                    player_name: string
                    town_hall_level?: number | null
                    total_stars?: number
                    total_destruction?: number
                    attacks_used?: number
                    map_position?: number | null
                    daily_attacks?: Json
                    created_at?: string
                    updated_at?: string
                    defense_stars?: number | null
                    defense_destruction?: number | null
                    defense_attacker_tag?: string | null
                }
                Update: {
                    id?: string
                    league_history_id?: string
                    player_tag?: string
                    player_name?: string
                    town_hall_level?: number | null
                    total_stars?: number
                    total_destruction?: number
                    attacks_used?: number
                    map_position?: number | null
                    daily_attacks?: Json
                    created_at?: string
                    updated_at?: string
                    defense_stars?: number | null
                    defense_destruction?: number | null
                    defense_attacker_tag?: string | null
                }
            }
            planning_members: {
                Row: {
                    tag: string
                    clan_tag: string
                    name: string | null
                    war_status: 'available' | 'excluded'
                    cwl_status: 'available' | 'excluded'
                    war_note: string | null
                    cwl_day: number | null
                    updated_at: string | null
                }
                Insert: {
                    tag: string
                    clan_tag: string
                    name?: string | null
                    war_status?: 'available' | 'excluded'
                    cwl_status?: 'available' | 'excluded'
                    war_note?: string | null
                    cwl_day?: number | null
                    updated_at?: string | null
                }
                Update: {
                    tag?: string
                    clan_tag?: string
                    name?: string | null
                    war_status?: 'available' | 'excluded'
                    cwl_status?: 'available' | 'excluded'
                    war_note?: string | null
                    cwl_day?: number | null
                    updated_at?: string | null
                }
            }
            players: {
                Row: {
                    tag: string
                    name: string
                    created_at: string
                }
                Insert: {
                    tag: string
                    name: string
                    created_at?: string
                }
                Update: {
                    tag?: string
                    name?: string
                    created_at?: string
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
            strategies: {
                Row: {
                    id: string
                    created_at: string
                    title: string
                    description: string | null
                    type: 'ground' | 'air' | null
                    min_town_hall: number | null
                    army_link: string | null
                    video_url: string | null
                    image_url: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    title: string
                    description?: string | null
                    type?: 'ground' | 'air' | null
                    min_town_hall?: number | null
                    army_link?: string | null
                    video_url?: string | null
                    image_url?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    title?: string
                    description?: string | null
                    type?: 'ground' | 'air' | null
                    min_town_hall?: number | null
                    army_link?: string | null
                    video_url?: string | null
                    image_url?: string | null
                }
            }
            tracked_clans: {
                Row: {
                    ordered: number
                    created_at: string
                    name: string
                    tag: string
                    badge_url: string | null
                }
                Insert: {
                    ordered: number
                    created_at?: string
                    name: string
                    tag: string
                    badge_url?: string | null
                }
                Update: {
                    ordered?: number
                    created_at?: string
                    name?: string
                    tag?: string
                    badge_url?: string | null
                }
            }
            users: {
                Row: {
                    id: string
                    email: string
                    username: string | null
                    user_type: 'super_admin' | 'admin' | 'editor' | 'viewer'
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    username?: string | null
                    user_type?: 'super_admin' | 'admin' | 'editor' | 'viewer'
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    username?: string | null
                    user_type?: 'super_admin' | 'admin' | 'editor' | 'viewer'
                    updated_at?: string
                }
            }
            war_history: {
                Row: {
                    id: number
                    created_at: string
                    start_date: string | null
                    end_date: string
                    team_size: number | null
                    clan_tag: string
                    clan_name: string | null
                    clan_stars: number | null
                    clan_destruction: number | null
                    opponent_tag: string
                    opponent_name: string | null
                    opponent_stars: number | null
                    opponent_destruction: number | null
                    result: string | null
                    clan_badge_url: string | null
                    opponent_badge_url: string | null
                }
                Insert: {
                    id?: number
                    created_at?: string
                    start_date?: string | null
                    end_date: string
                    team_size?: number | null
                    clan_tag: string
                    clan_name?: string | null
                    clan_stars?: number | null
                    clan_destruction?: number | null
                    opponent_tag: string
                    opponent_name?: string | null
                    opponent_stars?: number | null
                    opponent_destruction?: number | null
                    result?: string | null
                    clan_badge_url?: string | null
                    opponent_badge_url?: string | null
                }
                Update: {
                    id?: number
                    created_at?: string
                    start_date?: string | null
                    end_date?: string
                    team_size?: number | null
                    clan_tag?: string
                    clan_name?: string | null
                    clan_stars?: number | null
                    clan_destruction?: number | null
                    opponent_tag?: string
                    opponent_name?: string | null
                    opponent_stars?: number | null
                    opponent_destruction?: number | null
                    result?: string | null
                    clan_badge_url?: string | null
                    opponent_badge_url?: string | null
                }
            }
            war_participants: {
                Row: {
                    id: number
                    created_at: string
                    war_id: number
                    player_tag: string
                    player_name: string | null
                    stars: number
                    destruction: number
                    attacks_count: number
                    town_hall_level: number | null
                    map_position: number | null
                    defense_stars: number | null
                    defense_destruction: number | null
                    defense_attacker_tag: string | null
                    attacks: Json
                }
                Insert: {
                    id?: number
                    created_at?: string
                    war_id: number
                    player_tag: string
                    player_name?: string | null
                    stars?: number
                    destruction?: number
                    attacks_count?: number
                    town_hall_level?: number | null
                    map_position?: number | null
                    defense_stars?: number | null
                    defense_destruction?: number | null
                    defense_attacker_tag?: string | null
                    attacks?: Json
                }
                Update: {
                    id?: number
                    created_at?: string
                    war_id?: number
                    player_tag?: string
                    player_name?: string | null
                    stars?: number
                    destruction?: number
                    attacks_count?: number
                    town_hall_level?: number | null
                    map_position?: number | null
                    defense_stars?: number | null
                    defense_destruction?: number | null
                    defense_attacker_tag?: string | null
                    attacks?: Json
                }
            }
            wars: {
                Row: {
                    id: number
                    created_at: string
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
        }
    }
}
