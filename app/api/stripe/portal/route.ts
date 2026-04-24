import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { getSiteUrl } from "@/lib/site-url";

// Stripe Customer Portal セッションを発行し、ユーザーに解約・支払方法変更などを任せる。
export async function POST(_request: NextRequest) {
  const site = getSiteUrl();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", site), { status: 303 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = dbUser?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    return NextResponse.redirect(new URL("/mypage?portal=nocustomer", site), {
      status: 303,
    });
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${site}/mypage`,
  });

  return NextResponse.redirect(session.url, { status: 303 });
}
