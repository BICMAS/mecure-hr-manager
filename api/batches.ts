import { authFetchJson } from "@/utils/fetchWithAuth";

export interface LearnerBatch {
  id: string;
  name: string;
}

export function listBatches() {
  return authFetchJson<LearnerBatch[]>("/batches");
}

export function createBatch(name: string) {
  return authFetchJson<LearnerBatch>("/batches", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
