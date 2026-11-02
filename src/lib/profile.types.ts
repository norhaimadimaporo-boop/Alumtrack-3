import type { MyProfile, VerificationStatus } from "./admin.types";
import type { AddressInput, EducationLevel, EmploymentInput } from "./registration.types";

/** Minimal identity used by the alumni sidebar and page headers. */
export type AlumniSessionUser = {
  userId: number;
  fullName: string;
  firstName: string;
  batch: string;
  initials: string;
  verificationStatus: VerificationStatus | null;
};

export type ProfileEditInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: "Male" | "Female" | "Prefer not to say";
  birthDate: string;
  ethnicity: string;
  birthPlace: string;
  religion: string;
  mobileNumber: string;
  contactEmail: string;
  akanEmail: string;
  facebook: string;
  currentAddress: AddressInput;
  homeAddress: AddressInput;
};

export type EducationRecordInput = {
  id?: number;
  level: EducationLevel;
  schoolIdNo: string;
  degree: string;
  major: string;
  college: string;
  school: string;
  schoolAddress: string;
  graduatedOn: string;
};

export type EmploymentRecordInput = {
  id?: number;
  isCurrent: boolean;
  position: string;
  company: string;
  companyAddress: string;
  lengthOfEmployment: string;
  yearsInOffice: string;
  workLocation: EmploymentInput["workLocation"];
  sector: EmploymentInput["sector"];
};

export type OrganizationRecordInput = {
  id?: number;
  name: string;
  address: string;
  position: string;
  contactNo: string;
  email: string;
  memberSince: string;
};

export type WorkspaceEducation = EducationRecordInput & { id: number };
export type WorkspaceEmployment = EmploymentRecordInput & { id: number };
export type WorkspaceOrganization = OrganizationRecordInput & { id: number };

export type MyWorkspace =
  | {
      ok: true;
      user: AlumniSessionUser;
      canEdit: boolean;
      profile: MyProfile | null;
      editable: ProfileEditInput | null;
      education: WorkspaceEducation[];
      employment: WorkspaceEmployment[];
      organizations: WorkspaceOrganization[];
    }
  | { ok: false; message: string };

export type AlumniSessionResult =
  { ok: true; user: AlumniSessionUser | null } | { ok: false; message: string };

export type SaveResult = { ok: true; message: string } | { ok: false; message: string };
