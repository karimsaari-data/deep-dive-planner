export interface PollOption {
  id: string
  label: string
}

export interface Poll {
  id: string
  title: string
  options: PollOption[]
  allow_multiple: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
  closes_at: string | null
}

export interface Vote {
  id: string
  poll_id: string
  member_id: string
  user_id: string | null
  selected_options: string[]
  voted_at: string
}

export interface DirectoryMember {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  gender: string | null
}
