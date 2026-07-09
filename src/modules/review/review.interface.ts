export interface CreateReviewData {
  gearId: string;
  orderId: string;
  rating: number;
  comment?: string;
  userId: string;
}
