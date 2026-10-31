export type VerificationStatus = "pending" | "verified" | "rejected";
export type ProfileEmploymentStatus = "employed" | "unemployed" | "unknown";

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
