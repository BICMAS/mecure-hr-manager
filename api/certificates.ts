import { getAccessToken } from "../utils/auth";

import { getApiV1BaseUrl } from "../lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

async function fetchWithAuth(input: string, init?: RequestInit) {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

export async function createCertificateTemplate(
  templateFile: File,
  description: string,
) {
  const formData = new FormData();
  formData.append("template", templateFile);
  formData.append("description", description);

  const res = await fetchWithAuth(`${API_BASE}/certificates`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create certificate template");
  }

  const data = await res.json().catch(() => null);
  return data?.data ?? data ?? null;
}

export async function assignCertificateTemplate(
  courseId: string,
  templateId: string,
) {
  const res = await fetchWithAuth(`${API_BASE}/certificates/assign-template`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ courseId, templateId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to assign certificate template");
  }

  const data = await res.json().catch(() => null);
  return data?.data ?? data ?? null;
}

export async function getMyAssignedTemplate() {
  const res = await fetchWithAuth(`${API_BASE}/certificates/my-assigned-template`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch assigned HR template");
  }

  const data = await res.json().catch(() => null);
  return data?.data ?? data ?? null;
}

export async function getAssignedTemplateForCourse(courseId: string) {
  const res = await fetchWithAuth(
    `${API_BASE}/certificates/course/${courseId}/template`,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch assigned course template");
  }

  const data = await res.json().catch(() => null);
  return data?.data ?? data ?? null;
}

export async function issueCertificateToLearner(
  userId: string,
  courseId: string,
  templateId?: string,
) {
  const payload: Record<string, string> = { userId, courseId };
  if (templateId) payload.templateId = templateId;

  const res = await fetchWithAuth(`${API_BASE}/certificates/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to issue certificate");
  }

  const data = await res.json().catch(() => null);
  return data?.data ?? data ?? null;
}

export async function getLatestCertificateDownload() {
  const res = await fetchWithAuth(`${API_BASE}/certificates/latest/download`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to download latest certificate");
  }

  const blob = await res.blob();
  return blob;
}

export async function getCertificateDownloadById(certificateId: string) {
  const res = await fetchWithAuth(
    `${API_BASE}/certificates/${certificateId}/download`,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to download certificate");
  }

  const blob = await res.blob();
  return blob;
}

