import {User, UserRole, Department} from "../types"

const normalizeEnum = (value?: string) =>
  value?.toUpperCase().trim();

export const mapFormToHrCreatePayload = (formData: Partial<User>) => {
    return {
    fullName: formData.name,
    email: formData.email,
    userRole: normalizeEnum(formData.role),
    department: normalizeEnum(formData.department),
    phoneNumber: formData.phoneNumber || "", // optional but explicit
    group: formData.group || "General",
    password: formData.password,
    }
}