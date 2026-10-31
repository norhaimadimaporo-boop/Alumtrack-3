export const EDUCATION_LEVELS = [
  "Post Graduate Degree",
  "Graduate Degree",
  "Baccalaureate Degree",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export type AddressInput = {
  building: string;
  houseNo: string;
  block: string;
  street: string;
  subdivision: string;
  city: string;
  province: string;
  zipCode: string;
};

export type EducationInput = {
  level: EducationLevel;
  schoolIdNo: string;
  degree: string;
  major: string;
  college: string;
  school: string;
  schoolAddress: string;
  graduatedOn: string;
};

export type EmploymentInput = {
  position: string;
  company: string;
  companyAddress: string;
  lengthOfEmployment: string;
  yearsInOffice: string;
  workLocation: "Local" | "Abroad" | "";
  sector:
    "Government" | "Non-Government / Private Institution" | "Freelance / Entrepreneurial" | "";
};

export type OrganizationInput = {
  name: string;
  address: string;
  position: string;
  contactNo: string;
  email: string;
  memberSince: string;
};

export type RegistrationInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: "Male" | "Female" | "Prefer not to say";
  birthDate: string;
  ethnicity: string;
  birthPlace: string;
  religion: string;
  accountEmail: string;
  password: string;
  sameAddress: boolean;
  currentAddress: AddressInput;
  homeAddress: AddressInput;
  mobileNumber: string;
  contactEmail: string;
  akanEmail: string;
  facebook: string;
  education: EducationInput[];
  employmentStatus: "employed" | "unemployed" | "unknown";
  employment: EmploymentInput | null;
  organization: OrganizationInput | null;
};

export type RegistrationResult =
  { ok: true; message: string } | { ok: false; message: string; field?: string };
