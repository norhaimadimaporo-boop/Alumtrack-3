export type VerificationStatus = "pending" | "verified" | "rejected";
export type ProfileEmploymentStatus = "employed" | "unemployed" | "unknown";

/** Three-tier administrator hierarchy: head > standard > viewer. */
export type AdminAccountRole = "head" | "standard" | "viewer";

export type AdminAccount = {
  id: number;
  email: string;
  fullName: string;
  role: AdminAccountRole;
  active: boolean;
  createdAt: string;
  lastLogin: string;
  /** True for the signed-in administrator; blocks self-demotion controls in the UI. */
  isSelf: boolean;
};

export type AdminAccountList =
  { ok: true; accounts: AdminAccount[]; currentUserId: number } | { ok: false; message: string };

export type AdminAccountInput = {
  fullName: string;
  email: string;
  password: string;
  role: AdminAccountRole;
};

export type AdminAccountUpdate = {
  id: number;
  fullName: string;
  email: string;
  role: AdminAccountRole;
  active: boolean;
  password?: string | undefined;
};

export type AdminDashboardStats = {
  registeredAlumni: number;
  pendingVerification: number;
  verifiedAlumni: number;
  employedAlumni: number;
  activePosts: number;
  adminAccounts: number;
};

export type AdminActivityItem = {
  id: string;
  text: string;
  time: string;
  kind: "registration" | "verification" | "deletion" | "login" | "admin";
};

export type AdminRecentAlumnus = {
  id: number;
  name: string;
  course: string;
  batch: string;
  status: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
};

export type AdminDashboardData =
  | {
      ok: true;
      stats: AdminDashboardStats;
      activity: AdminActivityItem[];
      recentRegistrations: AdminRecentAlumnus[];
    }
  | { ok: false; message: string };

export type AdminEducationRecord = {
  id?: number;
  level: string;
  schoolIdNo: string;
  degree: string;
  major: string;
  college: string;
  school: string;
  schoolAddress: string;
  graduatedOn: string;
};

export type AdminEmploymentRecord = {
  id?: number;
  position: string;
  company: string;
  companyAddress: string;
  lengthOfEmployment: string;
  yearsInOffice: string;
  workLocation: string;
  sector: string;
  isCurrent: boolean;
};

export type AdminOrganizationRecord = {
  id?: number;
  name: string;
  address: string;
  position: string;
  contactNo: string;
  email: string;
  memberSince: string;
};

export type AdminAlumnus = {
  id: number;
  userId: number;
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  age: string;
  ethnicity: string;
  birthPlace: string;
  religion: string;
  email: string;
  mobileNumber: string;
  contactEmail: string;
  akanEmail: string;
  facebook: string;
  course: string;
  college: string;
  batch: string;
  status: string;
  employmentStatus: ProfileEmploymentStatus;
  job: string;
  company: string;
  region: string;
  verificationStatus: VerificationStatus;
  verified: boolean;
  createdAt: string;
  currentAddress: string;
  homeAddress: string;
  education: AdminEducationRecord[];
  employment: AdminEmploymentRecord[];
  organizations: AdminOrganizationRecord[];
};

export type AdminAlumniList = { ok: true; alumni: AdminAlumnus[] } | { ok: false; message: string };

export type AdminActionResult = { ok: true; message: string } | { ok: false; message: string };

export type AdminImportResult =
  | {
      ok: true;
      message: string;
      created: number;
      updated: number;
      totalRows: number;
      errors: string[];
    }
  | { ok: false; message: string; errors: string[] };

export type MyProfile = {
  userId: number;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  gender: string;
  birthDate: string;
  age: string;
  ethnicity: string;
  birthPlace: string;
  religion: string;
  mobileNumber: string;
  contactEmail: string;
  akanEmail: string;
  facebook: string;
  course: string;
  college: string;
  batch: string;
  status: string;
  employmentStatus: ProfileEmploymentStatus;
  job: string;
  company: string;
  region: string;
  verificationStatus: VerificationStatus;
  currentAddress: string;
  homeAddress: string;
  education: AdminEducationRecord[];
  employment: AdminEmploymentRecord[];
  organizations: AdminOrganizationRecord[];
};

export type MyProfileResult =
  { ok: true; profile: MyProfile | null } | { ok: false; message: string };
