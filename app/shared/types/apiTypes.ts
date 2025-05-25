export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: number;
  profilePic?: string;
  bio?: string;
  status?: 'invited' | 'active' | 'inactive';
  friends: Friend[];
  teams: Team[];
  goals: Goal[];
  tasks: Task[];
}

export interface Goal {
  id: number;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: number;
  tasks: Task[];
  rewards: Reward[];
  members: GoalMember[];
  teams: GoalTeam[];
}

export interface GoalMember {
  id: number;
  goalId: number;
  userId: number;
  role: 'owner' | 'member';
  status: 'invited' | 'active';
}

export interface Team {
  id: number;
  name: string;
  isPublic: boolean;
  createdAt: number;
  members: TeamMember[];
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: 'owner' | 'member';
}

export interface GoalTeam {
  id: number;
  goalId: number;
  teamId: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: number;
  goalId: number;
  members: TaskMember[];
  rewards: Reward[];
  points: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  interval: number;
  startDate: number;
  endDate: number;
  status: 'active' | 'completed' | 'archived';
}

export interface TaskMember {
  id: number;
  taskId: number;
  userId: number;
  role: 'owner' | 'member';
}

export interface Reward {
  id: number;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: number;
  goalId: number;
}

export interface Friend {
  id: number;
  userId: number;
  friendId: number;
  status: 'requested' | 'accepted' | 'blocked';
}

export interface Event {
  id: number;
  type: EventType;
  title: string;
  description?: string;
  timestamp: string;
  userId?: number;
  otherUserId?: number;
  teamId?: number;
  goalId?: number;
  taskId?: number;
  rewardId?: number;
  data?: any;
}

export type EventType =
  | 'user_created'
  | 'user_updated'
  | 'goal_created'
  | 'user_joined_goal'
  | 'user_left_goal'
  | 'team_created'
  | 'user_joined_team'
  | 'user_invited_to_team'
  | 'user_left_team'
  | 'task_created'
  | 'task_updated'
  | 'user_completed_task'
  | 'user_completed_task_verified'
  | 'task_assigned_to_user'
  | 'task_assigned_to_team'
  | 'task_unassigned_from_user'
  | 'task_unassigned_from_team'
  | 'reward_created'
  | 'reward_updated'
  | 'reward_redeemed_by_user'
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'friend_request_declined';