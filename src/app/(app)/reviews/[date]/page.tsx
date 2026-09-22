import { ReviewDetailView } from "@/components/reviews/ReviewDetailView";

export default async function ReviewDetailPage({ params }: PageProps<"/reviews/[date]">) {
  const { date } = await params;
  return <ReviewDetailView date={date} />;
}
