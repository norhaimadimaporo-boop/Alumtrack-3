export type Alumnus = {
  id: number;
  name: string;
  course: string;
  college: string;
  batch: string;
  job: string;
  company: string;
  region: string;
  status: "Employed" | "Self-employed" | "Further Studies";
};

export const COLLEGES = [
  "College of Information and Computing Sciences",
  "College of Engineering",
  "College of Business Administration and Accountancy",
  "College of Health Sciences",
  "College of Education",
] as const;

export const COURSES = [
  "BS Information Technology",
  "BS Computer Science",
  "BS Civil Engineering",
  "BS Accountancy",
  "BS Nursing",
  "BS Education",
] as const;

export const REGIONS = [
  "BARMM",
  "Region X — Northern Mindanao",
  "Region XI — Davao",
  "Region XII — SOCCSKSARGEN",
  "NCR — Metro Manila",
  "Overseas",
] as const;

export const BATCHES = ["2024", "2022", "2020", "2018", "2015", "2010"] as const;

export const ALUMNI: Alumnus[] = [
  {
    id: 1,
    name: "Naimah T. Abdulcader",
    course: "BS Information Technology",
    college: "College of Information and Computing Sciences",
    batch: "2024",
    job: "Software Engineer",
    company: "Accenture Philippines",
    region: "NCR — Metro Manila",
    status: "Employed",
  },
  {
    id: 2,
    name: "Sittie Asmerah Faimah M. Ampatua",
    course: "BS Computer Science",
    college: "College of Information and Computing Sciences",
    batch: "2022",
    job: "Data Analyst",
    company: "Globe Telecom",
    region: "NCR — Metro Manila",
    status: "Employed",
  },
  {
    id: 3,
    name: "Norhaimah Y. Dimaporo",
    course: "BS Information Technology",
    college: "College of Information and Computing Sciences",
    batch: "2022",
    job: "IT Support Specialist",
    company: "Lanao del Sur Provincial Government",
    region: "BARMM",
    status: "Employed",
  },
  {
    id: 4,
    name: "Abdul Rahman S. Macabangon",
    course: "BS Civil Engineering",
    college: "College of Engineering",
    batch: "2018",
    job: "Project Engineer",
    company: "DPWH Region X",
    region: "Region X — Northern Mindanao",
    status: "Employed",
  },
  {
    id: 5,
    name: "Jasmin P. Lucero",
    course: "BS Accountancy",
    college: "College of Business Administration and Accountancy",
    batch: "2020",
    job: "Junior Auditor",
    company: "SGV & Co.",
    region: "Region XI — Davao",
    status: "Employed",
  },
  {
    id: 6,
    name: "Farhana A. Sarip",
    course: "BS Nursing",
    college: "College of Health Sciences",
    batch: "2015",
    job: "Registered Nurse",
    company: "King Faisal Specialist Hospital",
    region: "Overseas",
    status: "Employed",
  },
  {
    id: 7,
    name: "Mohammad Ali D. Usman",
    course: "BS Education",
    college: "College of Education",
    batch: "2010",
    job: "Senior High School Teacher",
    company: "DepEd Marawi City Division",
    region: "BARMM",
    status: "Employed",
  },
  {
    id: 8,
    name: "Rania K. Bantuas",
    course: "BS Computer Science",
    college: "College of Information and Computing Sciences",
    batch: "2020",
    job: "Founder",
    company: "Ranao Digital Studio",
    region: "BARMM",
    status: "Self-employed",
  },
  {
    id: 9,
    name: "Christian L. Bello",
    course: "BS Information Technology",
    college: "College of Information and Computing Sciences",
    batch: "2024",
    job: "MS Computer Science Student",
    company: "University of the Philippines Diliman",
    region: "NCR — Metro Manila",
    status: "Further Studies",
  },
  {
    id: 10,
    name: "Sarah Jane M. Ocampo",
    course: "BS Civil Engineering",
    college: "College of Engineering",
    batch: "2015",
    job: "Structural Designer",
    company: "EEI Corporation",
    region: "Region XII — SOCCSKSARGEN",
    status: "Employed",
  },
  {
    id: 11,
    name: "Omar H. Pangandaman",
    course: "BS Accountancy",
    college: "College of Business Administration and Accountancy",
    batch: "2018",
    job: "Finance Officer",
    company: "Bangko Sentral ng Pilipinas",
    region: "NCR — Metro Manila",
    status: "Employed",
  },
  {
    id: 12,
    name: "Aisha M. Balindong",
    course: "BS Education",
    college: "College of Education",
    batch: "2024",
    job: "Instructor I",
    company: "MSU Marawi",
    region: "BARMM",
    status: "Employed",
  },
];

export function initials(name: string) {
  const parts = name.split(" ").filter((p) => p.length > 1 && !p.includes("."));
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}