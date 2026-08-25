import type { AdminIidxProfileDetail } from "@/api/iidx/profile/types";

export interface IidxProfileCardProps {
  profile?: AdminIidxProfileDetail;
  isPending: boolean;
}
