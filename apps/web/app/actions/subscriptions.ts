"use server"

import { cookies } from "next/headers"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"
import { apiFetchWithAuth, apiFetch } from "@/lib/api"
import { requireAuth } from "@/lib/auth"
import {
  cancelMySubscriptionSchema,
  changeMySubscriptionPlanSchema,
  pauseMySubscriptionSchema,
  resumeMySubscriptionSchema,
  subscribeMySubscriptionSchema,
} from "@workdeal/shared"

export type PlanFeatureView = { featureKey: string; featureValue: string | null; label: string | null }

export type PublicPlan = {
  id: string
  slug: string
  name: string
  description: string | null
  priceMzn: number
  interval: "monthly" | "quarterly" | "yearly"
  trialDays: number
  maxProfiles: number | null
  maxTeamMembers: number | null
  maxListings: number | null
  maxBranches: number | null
  apiAccess: boolean
  maxApiCallsPerMonth: number | null
  isPublic: boolean
  isActive: boolean
  sortOrder: number
  features: PlanFeatureView[]
}

export type CurrentSubscription = {
  subscription: {
    id: string
    organizationId: string | null
    planId: string
    status: "active" | "past_due" | "trialing" | "cancelled" | "paused" | "expired"
    trialEndsAt: string | null
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAt: string | null
    cancelledAt: string | null
    cancelReason: string | null
    pausedAt: string | null
    resumeAt: string | null
    planName?: string
    planSlug?: string
    planPriceMzn?: number
    planInterval?: "monthly" | "quarterly" | "yearly"
    organizationName?: string | null
    metadata?: Record<string, unknown> | null
  }
  plan: PublicPlan | null
  features: PlanFeatureView[]
  pendingPayment: {
    id: string
    amountMzn: number
    method: string | null
    status: string
    invoiceNumber: string | null
    createdAt: string
    proof: { fileId?: string; url?: string; name?: string; reference?: string } | null
  } | null
}

async function getAuthToken(): Promise<string> {
  const store = await cookies()
  const token = store.get(JWT_COOKIE_NAME)?.value
  if (!token) throw new Error("Sessão expirada. Faça login novamente.")
  return token
}

export async function fetchPublicPlans() {
  return apiFetch<PublicPlan[]>("/api/v1/plans", { cache: "no-store" })
}

export async function getCurrentSubscription(organizationId: string) {
  await requireAuth()
  return apiFetch<CurrentSubscription>(
    `/api/v1/subscriptions/current?organizationId=${encodeURIComponent(organizationId)}`,
    { cache: "no-store" },
  )
}

export type SubscribePayment = {
  method?: "bank_transfer" | "mpesa" | "emola" | "card" | "credits";
  fileId: string;
  url: string;
  name?: string;
  reference?: string;
};

export async function subscribeMyPlan(organizationId: string, planId: string, payment?: SubscribePayment) {
  await requireAuth()
  const data = subscribeMySubscriptionSchema.parse({ organizationId, planId, payment })
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/subscriptions/current/subscribe", token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function changeMyPlan(organizationId: string, planId: string) {
  await requireAuth()
  const data = changeMySubscriptionPlanSchema.parse({ organizationId, planId })
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/subscriptions/current/change-plan", token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function cancelMyPlan(organizationId: string, input: { atPeriodEnd?: boolean; reason?: string }) {
  await requireAuth()
  const data = cancelMySubscriptionSchema.parse({ organizationId, ...input })
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/subscriptions/current/cancel", token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function pauseMyPlan(organizationId: string, resumeAt?: string | null) {
  await requireAuth()
  const data = pauseMySubscriptionSchema.parse({ organizationId, resumeAt: resumeAt ?? undefined })
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/subscriptions/current/pause", token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function resumeMyPlan(organizationId: string) {
  await requireAuth()
  const data = resumeMySubscriptionSchema.parse({ organizationId })
  const token = await getAuthToken()
  return apiFetchWithAuth("/api/v1/subscriptions/current/resume", token, {
    method: "POST",
    body: JSON.stringify(data),
  })
}