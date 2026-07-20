
export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  LEARNER = 'Learner',
}

export enum Department {
  ENGINEERING = 'Engineering',
  SALES = 'Sales',
  HR = 'HR',
  MARKETING = 'Marketing',
  OPERATIONS = 'Operations',
}

export enum CourseStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  OVERDUE = 'Overdue',
}

export enum SyncStatus {
  SYNCED = 'Synced',
  PENDING = 'Pending',
  FAILED = 'Failed',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  group?: string;
  avatarUrl: string;
  password?: string; // Optional for display during creation/editing
  points?: number;
  phoneNumber?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  status: string;
}

export interface CourseHint {
  title?: string;
  courseTitle?: string;
  courseName?: string;
  name?: string;
}

export interface LearnerProgress {
  id: string;
  userId: string;
  courseId: string;
  status: CourseStatus;
  progressPercent: number;
  score?: number;
  attempts: number;
  assignedDate: string;
  dueDate: string;
  completedDate?: string;
  syncStatus: SyncStatus;
  userName?: string;
  userDept?: string;
  courseTitle?: string;
  courseHint?: CourseHint | null;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issueDate: string;
  expiryDate?: string;
  certificateUrl: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  previewUrl: string;
  uploadDate: string;
  description?: string;
  templateUrl?: string;
}