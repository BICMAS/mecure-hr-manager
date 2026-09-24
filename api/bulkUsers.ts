import { authFetchJson } from "@/utils/fetchWithAuth";

export interface BulkUserUploadResult {
  created: number;
  skipped: number;
  message?: string;
}

export function uploadBulkUsers(file: File) {
  const body = new FormData();
  body.append("csv", file);
  return authFetchJson<BulkUserUploadResult>("/users/bulk-upload", {
    method: "POST",
    body,
  });
}
