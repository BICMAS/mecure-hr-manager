import { User, UserRole, Department } from "../types";

const normalizeEnum = (value?: string) => value?.toUpperCase().trim();

const normalizeOptionalContact = (value?: string | null) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const mapFormToHrCreatePayload = (formData: Partial<User>) => {
  return {
    fullName: formData.name,
    email: normalizeOptionalContact(formData.email),
    userRole: normalizeEnum(formData.role),
    department: normalizeEnum(formData.department),
    phoneNumber: normalizeOptionalContact(formData.phoneNumber),
    group: formData.group || "General",
    password: formData.password,
  };
};

export const mapFormToHrUpdatePayload = (formData: Partial<User>) => {
  const payload: Record<string, string | null | undefined> = {
    fullName: formData.name,
    email: normalizeOptionalContact(formData.email),
    phoneNumber: normalizeOptionalContact(formData.phoneNumber),
    userRole: normalizeEnum(formData.role),
    department: normalizeEnum(formData.department),
    group: formData.group || "General",
  };

  if (formData.password?.trim()) {
    payload.password = formData.password.trim();
  }

  return payload;
};
