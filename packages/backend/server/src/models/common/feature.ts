import { z } from 'zod';

export enum FeatureType {
  Feature = 0,
  Quota = 1,
}

// TODO(@forehalo): quota is a useless extra concept, merge it with feature
export const UserPlanQuotaConfig = z.object({
  // quota name
  name: z.string(),
  // single blob limit
  blobLimit: z.number(),
  // total blob limit
  storageQuota: z.number(),
  // history period of validity
  historyPeriod: z.number(),
  // member limit
  memberLimit: z.number(),
  // copilot action limit 10
  copilotActionLimit: z.number(),
});

export const WorkspaceQuotaConfig = UserPlanQuotaConfig.extend({
  // seat quota
  seatQuota: z.number(),
}).omit({
  copilotActionLimit: true,
});

function feature<T extends z.ZodRawShape>(configs: z.ZodObject<T>) {
  return z.object({
    type: z.literal(FeatureType.Feature),
    configs: configs,
  });
}

function quota<T extends z.ZodRawShape>(configs: z.ZodObject<T>) {
  return z.object({
    type: z.literal(FeatureType.Quota),
    configs: configs,
  });
}

export const Features = {
  copilot: feature(z.object({})),
  early_access: feature(z.object({ whitelist: z.array(z.string()) })),
  unlimited_workspace: feature(z.object({})),
  unlimited_copilot: feature(z.object({})),
  ai_early_access: feature(z.object({})),
  administrator: feature(z.object({})),
  free_plan_v1: quota(UserPlanQuotaConfig),
  pro_plan_v1: quota(UserPlanQuotaConfig),
  lifetime_pro_plan_v1: quota(UserPlanQuotaConfig),
  restricted_plan_v1: quota(UserPlanQuotaConfig),
  team_plan_v1: quota(WorkspaceQuotaConfig),
};

export type UserFeatureName = keyof Pick<
  typeof Features,
  | 'early_access'
  | 'ai_early_access'
  | 'unlimited_copilot'
  | 'administrator'
  | 'free_plan_v1'
  | 'pro_plan_v1'
  | 'lifetime_pro_plan_v1'
  | 'restricted_plan_v1'
>;
export type WorkspaceFeatureName = keyof Pick<
  typeof Features,
  'unlimited_workspace' | 'team_plan_v1'
>;

export type FeatureName = UserFeatureName | WorkspaceFeatureName;
export type FeatureConfigs<T extends FeatureName> = z.infer<
  (typeof Features)[T]['shape']['configs']
>;
