export interface Campaign {
  id: string;
  main_post: string;
  post_goal: string;
  source_url: string;
  linkedin_url: string;
  campaign_type: "posts" | "comments" | "both";
  posts: string[];
  comments: string[];
  published: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithMetrics extends Campaign {
  metrics: {
    postCopies: number;
    commentCopies: number;
    totalCopies: number;
    uniqueUsers: number;
  };
}

export interface GenerateRequest {
  mainPost: string;
  postGoal: string;
  numberOfVariations: number;
  numberOfComments: number;
  existingPosts?: string[];
  existingComments?: string[];
}

export interface GenerateResponse {
  posts: string[];
  comments: string[];
}
