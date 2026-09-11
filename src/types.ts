export interface PlayerData {
  id: string;
  name: string;
  position: string; // e.g. CF, SS, LWF, RWF, AMF, CMF, DMF, LB, RB, CB, GK
  rating: number;
  playstyle?: string; // e.g. Goal Poacher, Hole Player, Anchor Man, Build Up, Offensive Fullback
  confidence: 'High' | 'Medium' | 'Low' | 'Uncertain identification';
  identityStatus?: 'confirmed' | 'probable' | 'uncertain' | 'unidentified';
  confidenceScore?: number; // 0 to 100
  confidenceTier?: 'Confirmed' | 'High confidence' | 'Moderate confidence' | 'Low confidence' | 'Unidentified';
  playerType?: string; // e.g. Epic, Highlight, Standard, POTW, Show Time
  keyAttributes?: Record<string, number | string>;
  skills?: string[];
  roleExplanation?: string;
  isCustomEdited?: boolean;
  sourceScreenshots?: number[];
  evidence?: string[];
  detectedRegion?: { ymin: number; xmin: number; ymax: number; xmax: number };
  needsUserConfirmation?: boolean;
  ocrRawText?: string;
  candidateMatches?: Array<{ name: string; score: number; reason?: string }>;
  userConfirmed?: boolean;
  userCorrected?: boolean;
}

export interface CoachData {
  name: string;
  rating?: number;
  tacticalStyle: string; // e.g. Possession Game, Quick Counter, Long Ball Counter, Out Wide, Long Ball
  tacticalAffinity?: number;
  isIdentifiedFromScreenshot: boolean;
  confidence: 'High' | 'Medium' | 'Low' | 'Uncertain identification';
  confidenceScore?: number;
  evidence?: string[];
  explanation: string;
}

export interface IndividualInstruction {
  player: string;
  position: string;
  instruction: 'Stay Back' | 'Offensive' | 'Defensive' | 'Counter Target' | 'Deep Line' | 'Free Roam' | 'Track Back' | 'Attacking Fullback';
  why: string;
  category: 'Offence' | 'Defence';
}

export interface PlayerActionRecommendation {
  player: string;
  position: string;
  rating?: number;
  action: 'Level Training' | 'Player Progression Training' | 'Skills Training' | 'Position Training' | 'No Action';
  priority: 'High' | 'Medium' | 'Low';
  reason: string;
  tacticalBenefit: string;
}

export interface TacticalCategoryAdvice {
  title: string;
  summary: string;
  guidelines: string[];
}

export interface TacticalRecommendations {
  buildUp: TacticalCategoryAdvice;
  attacking: TacticalCategoryAdvice;
  defensiveTransition: TacticalCategoryAdvice;
  defending: TacticalCategoryAdvice;
  counterattacking: TacticalCategoryAdvice;
  playerMovement: TacticalCategoryAdvice;
}

export interface SimulationStep {
  stepNumber: number;
  title: string;
  description: string;
  activePlayers: string[];
}

export interface SimulationScenarioData {
  id: string;
  name: string;
  description: string;
  steps: SimulationStep[];
  // Positions of our XI and Opponent XI in relative percentage coordinates [x: 0-100, y: 0-100]
  keyFrames: {
    time: number; // 0 to 100% of scenario progression
    ball: { x: number; y: number };
    ourTeam: Array<{ id: string; name: string; position: string; x: number; y: number; isHighlight?: boolean }>;
    oppTeam: Array<{ id: string; name: string; position: string; x: number; y: number }>;
    teachingNote?: string;
  }[];
}

export interface SquadRatingsBreakdown {
  overall: number; // 0 - 100
  attack: number;
  midfield: number;
  defence: number;
  goalkeeping: number;
  balance: number;
  depth: number;
  tacticalSuitability: number;
  ratingsRationale: string;
}

export type ImageSourceType = 'screenshot' | 'camera' | 'file';

export interface UploadedImageItem {
  id: string;
  file?: File;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
  name: string;
  source: ImageSourceType;
  dimensions?: { width: number; height: number };
  qualityWarning?: string | null;
  sizeBytes?: number;
}

export interface ScreenshotMetadata {
  index: number;
  layoutType: 'squad_overview' | 'player_list' | 'player_details' | 'player_card' | 'formation_screen' | 'coach_screen' | 'unknown';
  resolution?: string;
  readability: 'Good' | 'Fair' | 'Poor';
  detectedPlayersCount: number;
  hasCoach: boolean;
  warningNote?: string;
}

export interface AnalysisQualityScore {
  score: number; // 0 to 100
  ratingLabel: string;
  summary: string;
  screenshotQualityVerdict: 'Clear & High Readability' | 'Acceptable Readability' | 'Difficult to Read - Warning';
  qualityNotes: string[];
  detectedRegionCount: number;
  confirmedCount: number;
  probableCount: number;
  uncertainCount: number;
  unidentifiedCount: number;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  title: string;
  screenshotCount: number;
  identifiedPlayers: PlayerData[];
  squadRatings: SquadRatingsBreakdown;
  strengths: string[];
  weaknesses: string[];
  recommendedFormation: string;
  alternativeFormation: string;
  formationExplanation: string;
  bestXI: {
    formation: string;
    players: (PlayerData & { pitchX: number; pitchY: number; selectionReason: string })[];
  };
  coachRecommendation: CoachData;
  individualInstructions: IndividualInstruction[];
  playerActionPlan: PlayerActionRecommendation[];
  tacticalRecommendations: TacticalRecommendations;
  simulationScenarios: SimulationScenarioData[];
  freeOrPaidStatus: 'free' | 'paid';
  paymentStatus: 'free' | 'paid' | 'disabled';
  analysisQuality?: AnalysisQualityScore;
  screenshotMetadata?: ScreenshotMetadata[];
  facts?: string[];
  inferences?: string[];
  actionRecommendations?: string[];
  isDeveloperModeAvailable?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  freeAnalysesRemaining: number;
  paidCredits: number;
  lastFreeResetAt: string;
  role: 'user' | 'admin';
}

export interface CommunityPost {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: string;
  title: string;
  description: string;
  formation: string;
  playstyle: string;
  squadRating: number;
  keyPlayers: string[];
  analysisSummary: string;
  likesCount: number;
  commentsCount: number;
  isLikedByCurrentUser?: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  transactionId: string;
  amount: number;
  currency: string;
  product: string;
  status: 'Completed' | 'Pending' | 'Failed';
  createdAt: string;
}

export interface SavedSquad {
  id: string;
  userId: string;
  squadName: string;
  formation: string;
  playstyle: string;
  squadRating?: number;
  players: PlayerData[];
  updatedAt: string;
  createdAt?: string;
  analysisData?: AnalysisResult;
  sourceCollection?: 'userSquads' | 'savedAnalyses';
}

