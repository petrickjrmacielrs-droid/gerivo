export type ContractScope = "GROUP" | "COMPANY";

export type EffectiveSubscriptionContext = {
  company: any;
  group: any | null;
  planScope: ContractScope;
  subscription: any | null;
};

export async function getEffectiveSubscription(admin: any, companyId: string): Promise<EffectiveSubscriptionContext> {
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, group_id, status, active")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) throw companyError;
  if (!company) throw new Error("Empresa não encontrada.");

  let group: any | null = null;
  let planScope: ContractScope = "COMPANY";
  if (company.group_id) {
    const { data: groupData, error: groupError } = await admin
      .from("business_groups")
      .select("id, name, status, active, plan_scope")
      .eq("id", company.group_id)
      .maybeSingle();
    if (groupError) throw groupError;
    group = groupData || null;
    planScope = group?.plan_scope === "GROUP" ? "GROUP" : "COMPANY";
  }

  let subscription: any | null = null;
  if (planScope === "GROUP" && company.group_id) {
    const result = await admin
      .from("company_subscriptions")
      .select("*")
      .eq("group_id", company.group_id)
      .eq("contract_scope", "GROUP")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error) throw result.error;
    subscription = result.data || null;
  }

  if (!subscription) {
    const scoped = await admin
      .from("company_subscriptions")
      .select("*")
      .eq("company_id", companyId)
      .eq("contract_scope", "COMPANY")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (scoped.error) throw scoped.error;
    subscription = scoped.data || null;
  }

  // Compatibilidade com bases que ainda não executaram a migration 014 no momento do deploy.
  if (!subscription) {
    const legacy = await admin
      .from("company_subscriptions")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (legacy.error) throw legacy.error;
    subscription = legacy.data || null;
  }

  return { company, group, planScope, subscription };
}
