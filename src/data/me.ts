export const ME = {
  // Phase 1 — Personal details
  lastName: "Abdulcader",
  firstName: "Naimah",
  middleName: "Tomawis",
  name: "Naimah T. Abdulcader",
  studentNo: "2020-30124",
  gender: "Female",
  birthDate: "14-03-2002",
  age: "24",
  ethnicity: "Maranao",
  birthPlace: "Marawi City, Lanao del Sur",
  religion: "Islam",

  // Academic
  course: "BS Information Technology",
  college: "College of Information and Computing Sciences",
  batch: "2024",
  status: "Employed",

  // Employment summary
  job: "Software Engineer",
  company: "Accenture Philippines",
  region: "NCR — Metro Manila",

  // Phase 2 — Address & contacts
  currentAddress: "Blk 4, Lot 12, Sunrise Subd., Taguig City, Metro Manila, 1630",
  homeAddress: "Brgy. Marinaut East, Marawi City, Lanao del Sur, 9700",
  contact: "+63 917 555 0142",
  email: "naimah.abdulcader@example.com",
  akanEmail: "naimah.abdulcader@msumain.edu.ph",
  facebook: "fb.com/naimah.abdulcader",

  skills: ["React", "Java", "SQL", "UI Design", "Project Management"],
  profileCompletion: 78,
};

export type EmploymentRecord = {
  id: number;
  idNo: string;
  position: string;
  company: string;
  location: string;
  workPlace: "Local" | "Abroad";
  sector: "Government" | "Non-Government / Private Institution" | "Freelance / Entrepreneurial";
  from: string;
  to?: string;
  current: boolean;
  length?: string;
  yearsAssumed?: string;
  otherInfo?: string;
};

export const EMPLOYMENT: EmploymentRecord[] = [
  {
    id: 1,
    idNo: "EMP-2025-001",
    position: "Software Engineer",
    company: "Accenture Philippines",
    location: "Taguig City, NCR",
    workPlace: "Local",
    sector: "Non-Government / Private Institution",
    from: "01-03-2025",
    current: true,
    length: "1 year, 5 months",
    yearsAssumed: "1 year",
    otherInfo: "Promoted from Associate Developer to Software Engineer in January 2026.",
  },
  {
    id: 2,
    idNo: "EMP-2024-014",
    position: "Junior Web Developer",
    company: "Ranao Digital Studio",
    location: "Marawi City, BARMM",
    workPlace: "Local",
    sector: "Freelance / Entrepreneurial",
    from: "01-07-2024",
    to: "28-02-2025",
    current: false,
    length: "8 months",
    yearsAssumed: "8 months",
  },
  {
    id: 3,
    idNo: "EMP-2024-002",
    position: "IT Intern",
    company: "MSU Management Information Systems Office",
    location: "Marawi City, BARMM",
    workPlace: "Local",
    sector: "Government",
    from: "15-01-2024",
    to: "30-05-2024",
    current: false,
    length: "4 months",
    yearsAssumed: "4 months",
  },
];

export type EducationRecord = {
  id: number;
  idNo: string;
  level: "Post Graduate Degree" | "Graduate Degree" | "Baccalaureate Degree";
  degree: string;
  major: string;
  college: string;
  school: string;
  schoolAddress: string;
  graduated: string;
};

export const EDUCATION: EducationRecord[] = [
  {
    id: 1,
    idNo: "2024-MSCS-0187",
    level: "Graduate Degree",
    degree: "Master of Science in Computer Science",
    major: "Software Engineering",
    college: "College of Information and Computing Sciences",
    school: "MSU — Main Campus",
    schoolAddress: "Marawi City, Lanao del Sur",
    graduated: "20-06-2026",
  },
  {
    id: 2,
    idNo: "2020-30124",
    level: "Baccalaureate Degree",
    degree: "Bachelor of Science in Information Technology",
    major: "Information Technology",
    college: "College of Information and Computing Sciences",
    school: "MSU — Main Campus",
    schoolAddress: "Marawi City, Lanao del Sur",
    graduated: "12-07-2024",
  },
];

export type OrganizationRecord = {
  id: number;
  idNo: string;
  name: string;
  address: string;
  position: string;
  contact: string;
  email: string;
  since: string;
  current: boolean;
  until?: string;
};

export const ORGANIZATIONS: OrganizationRecord[] = [
  {
    id: 1,
    idNo: "ORG-ITS-0421",
    name: "MSU Information Technology Society",
    address: "MSU Main Campus, Marawi City",
    position: "Vice President",
    contact: "+63 917 555 0188",
    email: "msu.itsociety@example.com",
    since: "05-09-2021",
    current: false,
    until: "30-06-2024",
  },
  {
    id: 2,
    idNo: "ORG-RYPN-0092",
    name: "Ranao Young Professionals Network",
    address: "Marawi City, Lanao del Sur",
    position: "Member",
    contact: "+63 927 444 1122",
    email: "rypn@example.com",
    since: "18-02-2025",
    current: true,
  },
];
