export interface Campaign {
  id: string;
  mainPost: string;
  postGoal: string;
  sourceUrl: string;
  campaignType: "posts" | "comments" | "both";
  posts: string[];
  comments: string[];
  createdAt: string;
  published: boolean;
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
