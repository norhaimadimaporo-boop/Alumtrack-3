import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  BadgeCheck,
  Upload,
  FileSpreadsheet,
  GraduationCap,
  Briefcase,
  Users,
  MapPin,
  Download,
  Phone,
  UserRound,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { AddressFields } from "@/components/address-fields";
import { Modal, LabeledInput, PrimaryButton } from "@/components/modal";
import { useAdminRole } from "@/hooks/use-session";
import { COURSES, COLLEGES, REGIONS, BATCHES, initials } from "@/data/alumni";
import { toast } from "sonner";

import {
  createAlumni,
  deleteAlumni,
  getAdminAlumni,
  importAlumni,
  updateAlumni,
  verifyAlumni,
} from "@/lib/admin.functions";
import type { AdminAlumnus as Alumnus, AdminImportResult } from "@/lib/admin.types";
import { calculateAge, toIsoDate } from "@/lib/profile-format";
import {
  primaryEducationRecord,
  priorityBatchYear,
  type AddressInput,
} from "@/lib/registration.types";

export const Route = createFileRoute("/admin/alumni")({
  head: () => ({
    meta: [
      { title: "Manage Alumni Directory — AlumTrack Admin" },
      {
        name: "description",
        content:
          "Add, edit, search, and delete alumni records and verify submitted professional information.",
      },
      { property: "og:title", content: "Manage Alumni Directory — AlumTrack Admin" },
      {
        property: "og:description",
        content: "Full control over alumni records and verification of professional info.",
      },
    ],
  }),
  loader: async () => getAdminAlumni(),
  component: AdminAlumni,
});

const idNumber = (a: Alumnus) => `${a.batch}-${30000 + a.id * 137}`;

function emptyAddress(): AddressInput {
  return {
    building: "",
    houseNo: "",
    block: "",
    street: "",
    subdivision: "",
    city: "",
    province: "",
    country: "",
    zipCode: "",
  };
}

const EXPORT_FIELDS = [
  "Last Name",
  "First Name",
  "Middle Name",
  "College",
  "Degree / Course",
  "Date Graduated",
  "Home Address",
  "Employment and Business Address",
  "Position",
  "Present Address",
  "MSU ID No.",
  "Email Address",
  "Contact Number",
  "Gender",
  "Religion",
];

const CSV_TEMPLATE_COLUMNS = [
  // Phase 1 — personal details
  "Last Name",
  "First Name",
  "Middle Name",
  "Gender",
  "Birth Date",
  "Ethnicity",
  "Religion",
  "Birth Place",
  // Phase 2 — address & contact
  "Home Address",
  "Present Address",
  "Contact Number",
  "Email Address",
  "Facebook Link",
  // Phase 3 — educational background
  "College",
  "Degree/Course taken",
  "Date Graduated",
  "Campus Graduated",
  "MSU ID No.",
  // Phase 4 — employment
  "Employment Status",
  "Employer",
  "Sector",
  "Position",
  "Workplace Address",
  // Phase 5 — organization affiliation
  "Organization Name",
  "Organization Position",
  "Organization Address",
  "Organization Contact",
  "Organization Email",
  "Member Since",
] as const;

const CSV_COLUMNS = CSV_TEMPLATE_COLUMNS.join(", ");

const CSV_INSTRUCTIONS = [
  { phase: "Phase 1", detail: "Personal details → users and alumni_profiles" },
  { phase: "Phase 2", detail: "Address and contact → alumni_addresses and alumni_profiles" },
  { phase: "Phase 3", detail: "Educational background → alumni_education (primary course synced)" },
  { phase: "Phase 4", detail: "Employment → alumni_employment and GIS map coordinates" },
  { phase: "Phase 5", detail: "Organization affiliation → alumni_organizations" },
] as const;

const IMPORT_TEMPLATE_FILENAME = "alumtrack-alumni-import-template.csv";

const PHASE_STEPS = [
  "Personal details",
  "Address & contact",
  "Educational background",
  "Employment",
  "Organization",
] as const;

/** Display order: Baccalaureate (primary/default) → Graduate → Post Graduate. */
const DEGREE_TYPES = ["Baccalaureate Degree", "Graduate Degree", "Post Graduate Degree"] as const;

type DegreeDetail = {
  schoolIdNo: string;
  degree: string;
  major: string;
  college: string;
  school: string;
  schoolAddress: string;
  graduatedOn: string;
};

function emptyDegreeDetail(): DegreeDetail {
  return {
    schoolIdNo: "",
    degree: "",
    major: "",
    college: "",
    school: "",
    schoolAddress: "",
    graduatedOn: "",
  };
}

function AdminAlumni() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const adminRole = useAdminRole();
  // Viewers get the read-only directory; null is the pre-hydration state.
  const canManage = adminRole === "head" || adminRole === "standard";
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [verification, setVerification] = useState("");
  const [viewing, setViewing] = useState<Alumnus | null>(null);
  const [editing, setEditing] = useState<Alumnus | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Alumnus | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<{
    name: string;
    size: number;
    text: string;
  } | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<AdminImportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportBatch, setExportBatch] = useState("");
  const [exportCourse, setExportCourse] = useState("");
  const [exportGender, setExportGender] = useState("");
  const [step, setStep] = useState(0);
  const [currentAddress, setCurrentAddress] = useState<AddressInput>(emptyAddress);
  const [homeAddress, setHomeAddress] = useState<AddressInput>(emptyAddress);
  const [sameAddress, setSameAddress] = useState(false);
  const [wizardGender, setWizardGender] = useState("");
  const [wizardDob, setWizardDob] = useState("");
  const [wizardAge, setWizardAge] = useState("");
  const [wizardFullName, setWizardFullName] = useState("");
  const [wizardEthnicity, setWizardEthnicity] = useState("");
  const [wizardBirthPlace, setWizardBirthPlace] = useState("");
  const [wizardReligion, setWizardReligion] = useState("");
  const [wizardMobile, setWizardMobile] = useState("");
  const [wizardContactEmail, setWizardContactEmail] = useState("");
  const [wizardAkanEmail, setWizardAkanEmail] = useState("");
  const [wizardFacebook, setWizardFacebook] = useState("");
  const [wizardDegreeDetails, setWizardDegreeDetails] = useState<
    Partial<Record<string, DegreeDetail>>
  >({});
  const [wizardCourse, setWizardCourse] = useState("");
  const [wizardCollege, setWizardCollege] = useState("");
  const [wizardBatch, setWizardBatch] = useState("");
  const [wizardRegion, setWizardRegion] = useState("");
  const [wizardPosition, setWizardPosition] = useState("");
  const [wizardCompany, setWizardCompany] = useState("");
  const [wizardCompanyAddress, setWizardCompanyAddress] = useState("");
  const [wizardLength, setWizardLength] = useState("");
  const [wizardYears, setWizardYears] = useState("");
  const [wizardWorkLoc, setWizardWorkLoc] = useState("");
  const [wizardSector, setWizardSector] = useState("");
  const [wizardOrgName, setWizardOrgName] = useState("");
  const [wizardOrgAddress, setWizardOrgAddress] = useState("");
  const [wizardOrgPosition, setWizardOrgPosition] = useState("");
  const [wizardOrgContact, setWizardOrgContact] = useState("");
  const [wizardOrgEmail, setWizardOrgEmail] = useState("");
  const [wizardOrgSince, setWizardOrgSince] = useState("");
  const [degreeTypes, setDegreeTypes] = useState<string[]>([]);
  const [employed, setEmployed] = useState<"employed" | "unemployed" | "">("");
  const [affiliated, setAffiliated] = useState<"yes" | "no" | "">("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const initWizard = (record: Alumnus | null) => {
    setCurrentAddress(record?.currentAddressParts ?? emptyAddress());
    setHomeAddress(record?.homeAddressParts ?? emptyAddress());
    setSameAddress(false);
    setWizardGender(record?.gender ?? "");
    setWizardDob(record?.birthDate ? toIsoDate(record.birthDate) : "");
    setWizardAge(record?.age ?? "");
    setWizardFullName(record?.name ?? "");
    setWizardEthnicity(record?.ethnicity ?? "");
    setWizardBirthPlace(record?.birthPlace ?? "");
    setWizardReligion(record?.religion ?? "");
    setWizardMobile(record?.mobileNumber ?? "");
    setWizardContactEmail(record?.contactEmail ?? "");
    setWizardAkanEmail(record?.akanEmail ?? "");
    setWizardFacebook(record?.facebook ?? "");
    const education = record?.education ?? [];
    setDegreeTypes(education.map((entry) => entry.level));
    const details: Partial<Record<string, DegreeDetail>> = {};
    for (const entry of education) {
      details[entry.level] = {
        schoolIdNo: entry.schoolIdNo ?? "",
        degree: entry.degree ?? "",
        major: entry.major ?? "",
        college: entry.college ?? "",
        school: entry.school ?? "",
        schoolAddress: entry.schoolAddress ?? "",
        graduatedOn: entry.graduatedOn ? toIsoDate(entry.graduatedOn) : "",
      };
    }
    setWizardDegreeDetails(details);
    // Dedup + Batch auto-sync on load: Course/College/Batch come from the
    // primary education record (Baccalaureate → Graduate → Post Graduate)
    // when one exists, so the upper Phase 3 fields and the lower dropdowns
    // can never show conflicting values. Fall back to the stored profile
    // values only when no education year/degree is on record.
    const educationForSync = Object.entries(details).map(([level, detail]) => ({
      level,
      degree: detail?.degree ?? "",
      college: detail?.college ?? "",
      graduatedOn: detail?.graduatedOn ?? "",
    }));
    const primaryEducation = primaryEducationRecord(educationForSync);
    const syncedBatch = priorityBatchYear(educationForSync);
    setWizardCourse(primaryEducation?.degree.trim() || record?.course || COURSES[0]);
    setWizardCollege(primaryEducation?.college.trim() || record?.college || COLLEGES[0]);
    setWizardBatch(syncedBatch || record?.batch || BATCHES[0]);
    setWizardRegion(record?.region ?? REGIONS[0]);
    const currentEmployment =
      record?.employment.find((entry) => entry.isCurrent) ?? record?.employment[0];
    setEmployed(
      record?.employmentStatus === "employed" || record?.employmentStatus === "unemployed"
        ? record.employmentStatus
        : "",
    );
    setWizardPosition(currentEmployment?.position ?? record?.job ?? "");
    setWizardCompany(currentEmployment?.company ?? record?.company ?? "");
    setWizardCompanyAddress(currentEmployment?.companyAddress ?? "");
    setWizardLength(currentEmployment?.lengthOfEmployment ?? "");
    setWizardYears(currentEmployment?.yearsInOffice ?? "");
    setWizardWorkLoc(currentEmployment?.workLocation ?? "");
    setWizardSector(currentEmployment?.sector ?? "");
    const organization = record?.organizations[0];
    setAffiliated(organization ? "yes" : "");
    setWizardOrgName(organization?.name ?? "");
    setWizardOrgAddress(organization?.address ?? "");
    setWizardOrgPosition(organization?.position ?? "");
    setWizardOrgContact(organization?.contactNo ?? "");
    setWizardOrgEmail(organization?.email ?? "");
    setWizardOrgSince(organization?.memberSince ? toIsoDate(organization.memberSince) : "");
  };

  const resetWizard = () => {
    setStep(0);
    initWizard(null);
  };

  // Auto-calculate age (years) from date of birth.
  useEffect(() => {
    setWizardAge(calculateAge(wizardDob) || "");
  }, [wizardDob]);

  /**
   * Phase 3 dedup + Batch Year auto-sync.
   * - Editing a primary degree's Degree/College copies it into the lower
   *   Course/College dropdowns (and vice versa below), so the two sections
   *   always hold the same value.
   * - Editing any Date Graduated re-derives Batch Year with priority
   *   Baccalaureate → Graduate → Post Graduate. An empty result (all dates
   *   cleared) keeps the current batch instead of blanking it.
   */
  const primaryLevel = (_details: Partial<Record<string, DegreeDetail>>, selected: string[]) =>
    DEGREE_TYPES.find((level) => selected.includes(level)) ?? null;

  const syncFromEducation = (
    details: Partial<Record<string, DegreeDetail>>,
    selected: string[],
  ) => {
    const entries = selected.map((level) => ({
      level,
      degree: details[level]?.degree ?? "",
      college: details[level]?.college ?? "",
      graduatedOn: details[level]?.graduatedOn ?? "",
    }));
    const primary = primaryEducationRecord(
      // Only levels the admin actually checked count as the primary source.
      entries.filter((entry) => selected.includes(entry.level)),
    );
    if (primary?.degree.trim()) setWizardCourse(primary.degree.trim());
    if (primary?.college.trim()) setWizardCollege(primary.college.trim());
    const batch = priorityBatchYear(entries);
    if (batch) setWizardBatch(batch);
  };

  const updateWizardDegree = (level: string, field: keyof DegreeDetail, value: string) => {
    const nextDetails = {
      ...wizardDegreeDetails,
      [level]: { ...(wizardDegreeDetails[level] ?? emptyDegreeDetail()), [field]: value },
    };
    setWizardDegreeDetails(nextDetails);
    syncFromEducation(nextDetails, degreeTypes);
  };

  const toggleDegreeType = (level: string) => {
    const nextSelected = degreeTypes.includes(level)
      ? degreeTypes.filter((item) => item !== level)
      : [...degreeTypes, level];
    setDegreeTypes(nextSelected);
    // Checking a degree makes it a candidate primary; sync any values it
    // already holds (e.g. when editing an existing record). Unchecking the
    // primary falls back to the next selected level.
    syncFromEducation(wizardDegreeDetails, nextSelected);
  };

  const handleCourseChange = (value: string) => {
    setWizardCourse(value);
    const level = primaryLevel(wizardDegreeDetails, degreeTypes);
    if (level) {
      setWizardDegreeDetails((prev) => ({
        ...prev,
        [level]: { ...(prev[level] ?? emptyDegreeDetail()), degree: value },
      }));
    }
  };

  const handleCollegeChange = (value: string) => {
    setWizardCollege(value);
    const level = primaryLevel(wizardDegreeDetails, degreeTypes);
    if (level) {
      setWizardDegreeDetails((prev) => ({
        ...prev,
        [level]: { ...(prev[level] ?? emptyDegreeDetail()), college: value },
      }));
    }
  };

  const wizardCourseOptions = Array.from(new Set([wizardCourse, ...COURSES])).filter(Boolean);
  const wizardCollegeOptions = Array.from(new Set([wizardCollege, ...COLLEGES])).filter(Boolean);
  const wizardBatchOptions = Array.from(new Set([wizardBatch, ...BATCHES]))
    .filter((value) => /^\d{4}$/.test(value))
    .sort((a, b) => Number(b) - Number(a));

  const handleVerify = async (record: Alumnus) => {
    setBusyId(record.id);
    setActionMessage(null);
    try {
      const result = await verifyAlumni({ data: { id: record.id } });
      setActionMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) await router.invalidate();
    } catch (error) {
      console.error(error);
      setActionMessage({
        tone: "error",
        text: "We could not verify this record right now. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (record: Alumnus) => {
    setBusyId(record.id);
    setActionMessage(null);
    try {
      const result = await deleteAlumni({ data: { id: record.id } });
      setActionMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) {
        setDeleting(null);
        await router.invalidate();
      }
    } catch (error) {
      console.error(error);
      setActionMessage({
        tone: "error",
        text: "We could not delete this record right now. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        fullName: wizardFullName,
        gender: wizardGender,
        birthDate: wizardDob,
        ethnicity: wizardEthnicity,
        birthPlace: wizardBirthPlace,
        religion: wizardReligion,
        currentAddress,
        homeAddress: sameAddress ? currentAddress : homeAddress,
        mobileNumber: wizardMobile,
        contactEmail: wizardContactEmail,
        akanEmail: wizardAkanEmail,
        facebook: wizardFacebook,
        education: [...degreeTypes]
          .sort(
            (a, b) => DEGREE_TYPES.indexOf(a as (typeof DEGREE_TYPES)[number]) - DEGREE_TYPES.indexOf(b as (typeof DEGREE_TYPES)[number]),
          )
          .map((level) => ({
            level,
            ...(wizardDegreeDetails[level] ?? emptyDegreeDetail()),
          })),
        course: wizardCourse,
        college: wizardCollege,
        batch: wizardBatch,
        region: wizardRegion,
        employmentStatus:
          employed === "employed" || employed === "unemployed" ? employed : "unknown",
        employment:
          employed === "employed"
            ? {
                position: wizardPosition,
                company: wizardCompany,
                companyAddress: wizardCompanyAddress,
                lengthOfEmployment: wizardLength,
                yearsInOffice: wizardYears,
                workLocation: wizardWorkLoc,
                sector: wizardSector,
              }
            : null,
        organization:
          affiliated === "yes"
            ? {
                name: wizardOrgName,
                address: wizardOrgAddress,
                position: wizardOrgPosition,
                contactNo: wizardOrgContact,
                email: wizardOrgEmail,
                memberSince: wizardOrgSince,
              }
            : null,
      };
      const result = editing
        ? await updateAlumni({ data: { id: editing.id, ...payload } })
        : await createAlumni({ data: payload });
      if (result.ok) {
        toast.success(
          editing ? "Alumni record updated successfully!" : "Alumni record added successfully!",
        );
        setActionMessage({ tone: "success", text: result.message });
        setAdding(false);
        setEditing(null);
        await router.invalidate();
      } else {
        setActionMessage({ tone: "error", text: result.message });
      }
    } catch (error) {
      console.error(error);
      setActionMessage({
        tone: "error",
        text: "We could not save this record right now. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImporting(true);
  };

  const closeImport = () => {
    if (importBusy) return;
    setImporting(false);
    setImportFile(null);
    setImportResult(null);
  };

  const downloadImportTemplate = () => {
    const blob = new Blob([`${CSV_COLUMNS}\r\n`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = IMPORT_TEMPLATE_FILENAME;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      setImportResult({ ok: false, message: "Please choose a .csv file.", errors: [] });
      return;
    }

    if (file.size > 5_000_000) {
      setImportResult({
        ok: false,
        message: "The CSV file is larger than 5 MB. Split it into smaller files.",
        errors: [],
      });
      return;
    }

    try {
      const text = await file.text();
      if (!text.trim()) {
        setImportResult({ ok: false, message: "The selected CSV file is empty.", errors: [] });
        return;
      }
      setImportFile({ name: file.name, size: file.size, text });
      setImportResult(null);
    } catch (error) {
      console.error(error);
      setImportResult({
        ok: false,
        message: "The selected file could not be read. Please try again.",
        errors: [],
      });
    }
  };

  const handleImport = async () => {
    if (!importFile || importBusy) return;

    setImportBusy(true);
    setImportResult(null);

    try {
      const result = await importAlumni({ data: { csv: importFile.text } });
      setImportResult(result);
      if (result.ok) {
        setImportFile(null);
        await router.invalidate();
      }
    } catch (error) {
      console.error(error);
      setImportResult({
        ok: false,
        message: "The import could not be completed right now. Please try again.",
        errors: [],
      });
    } finally {
      setImportBusy(false);
    }
  };

  if (!data.ok) {
    return (
      <AdminShell
        title="Manage Alumni Directory"
        subtitle="Add, edit, search, delete and verify alumni professional information."
      >
        <div className="rounded-lg border-t-4 border-brand bg-card p-6">
          <h2 className="text-sm font-bold text-foreground">Administrator sign-in required</h2>
          <p className="mt-2 text-sm text-muted-foreground">{data.message}</p>
          <Link
            to="/login"
            className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Go to Login
          </Link>
        </div>
      </AdminShell>
    );
  }

  const alumni = data.alumni;
  const courseOptions = [...new Set(alumni.map((record) => record.course))].sort();
  const batchOptions = [...new Set(alumni.map((record) => record.batch))]
    .filter((value) => value && value !== "—")
    .sort((a, b) => Number(b) - Number(a));

  const rows = alumni.filter((a) => {
    return (
      a.name.toLowerCase().includes(query.toLowerCase()) &&
      (course ? a.course === course : true) &&
      (batch ? a.batch === batch : true) &&
      (verification === "" ? true : verification === "Verified" ? a.verified : !a.verified)
    );
  });

  // Cascading export filters — independent of the directory search filters above.
  const exportRows = alumni.filter(
    (a) =>
      (exportBatch ? a.batch === exportBatch : true) &&
      (exportCourse ? a.course === exportCourse : true) &&
      (exportGender ? a.gender.trim() === exportGender : true),
  );

  const handleExport = () => {
    if (exportRows.length === 0) return;
    const escapeCsv = (value: string) => {
      const text = String(value ?? "");
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const fieldValue = (a: Alumnus, field: string) => {
      const employmentAddress =
        a.employment.find((entry) => entry.isCurrent)?.companyAddress ?? "";
      const values: Record<string, string> = {
        "Last Name": a.lastName,
        "First Name": a.firstName,
        "Middle Name": a.middleName,
        College: a.college,
        "Degree / Course": a.course,
        "Date Graduated": a.batch,
        "Home Address": a.homeAddress,
        "Employment and Business Address": employmentAddress,
        Position: a.job,
        "Present Address": a.currentAddress,
        "MSU ID No.": idNumber(a),
        "Email Address": a.contactEmail || a.email,
        "Contact Number": a.mobileNumber,
        Gender: a.gender,
        Religion: a.religion,
      };
      return values[field] ?? "";
    };
    const lines = [
      EXPORT_FIELDS.join(","),
      ...exportRows.map((a) => EXPORT_FIELDS.map((f) => escapeCsv(fieldValue(a, f))).join(",")),
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "alumtrack-alumni-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExporting(false);
    setExportBatch("");
    setExportCourse("");
    setExportGender("");
    // Reset/clear the active directory filters after a successful export.
    setQuery("");
    setCourse("");
    setBatch("");
    setVerification("");
  };

  const open = adding || editing !== null;
  const importRowCount = importFile
    ? Math.max(0, importFile.text.split(/\r?\n/).filter((line) => line.trim() !== "").length - 1)
    : 0;

  return (
    <AdminShell
      title="Manage Alumni Directory"
      subtitle="Add, edit, search, delete and verify alumni professional information."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setExporting(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-brand-foreground"
          >
            <Download className="size-3.5" /> Export
          </button>
          {canManage && (
            <>
              <button
                onClick={openImport}
                className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-brand-foreground"
              >
                <Upload className="size-3.5" /> Import
              </button>
              <button
                onClick={() => {
                  resetWizard();
                  setAdding(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
              >
                <Plus className="size-3.5" /> Add alumni
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alumni by name…"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <select
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">All courses</option>
          {courseOptions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">All batches</option>
          {batchOptions.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select
          value={verification}
          onChange={(e) => setVerification(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">All statuses</option>
          <option value="Verified">Verified</option>
          <option value="For Verification">For Verification</option>
        </select>
      </div>

      {actionMessage && (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            actionMessage.tone === "success"
              ? "border-success/40 bg-success/10 text-foreground"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {actionMessage.text}
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {rows.length} record{rows.length === 1 ? "" : "s"} found
      </p>

      <div className="mt-3 max-h-[580px] overflow-y-auto overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60">
            <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Alumni</th>
              <th className="px-4 py-3 font-semibold">Course / Batch</th>
              <th className="px-4 py-3 font-semibold">Employment</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No alumni records match your filters yet.
                </td>
              </tr>
            )}
            {rows.map((a) => {
              const verified = a.verified;
              return (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                        {initials(a.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">ID No. {idNumber(a)}</p>
                        <p className="text-xs text-muted-foreground">{a.region}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {a.course}
                    <br />
                    Batch {a.batch}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {a.job}
                    <br />
                    {a.company}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        verified
                          ? "bg-success text-success-foreground"
                          : "bg-highlight text-highlight-foreground"
                      }`}
                    >
                      <BadgeCheck className="size-3" />
                      {verified ? "Verified" : "For verification"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {canManage && !verified && (
                        <button
                          onClick={() => void handleVerify(a)}
                          disabled={busyId === a.id}
                          className="text-xs font-semibold text-success hover:underline disabled:opacity-50"
                        >
                          {busyId === a.id ? "Approving…" : "Approve"}
                        </button>
                      )}
                      <button
                        onClick={() => setViewing(a)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <Eye className="size-3" /> View
                      </button>
                      {canManage && (
                        <button
                          onClick={() => setDeleting(a)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-brand hover:underline"
                        >
                          <Trash2 className="size-3" /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {exporting && (
        <Modal title="Export alumni records" onClose={() => setExporting(false)}>
          <div className="space-y-4">
            <p className="rounded-md border-l-4 border-highlight bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              Filter the alumni records to include in the CSV export. The count updates as you
              change the filters.
            </p>

            <div className="grid gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Batch Year
                </label>
                <select
                  value={exportBatch}
                  onChange={(e) => setExportBatch(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">All batch years</option>
                  {batchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  College / Course
                </label>
                <select
                  value={exportCourse}
                  onChange={(e) => setExportCourse(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">All courses</option>
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Gender
                </label>
                <select
                  value={exportGender}
                  onChange={(e) => setExportGender(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">All genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">{exportRows.length}</span> of{" "}
              {alumni.length} alumni
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExporting(false)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Cancel
              </button>
              <button
                disabled={exportRows.length === 0}
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-40"
              >
                <FileSpreadsheet className="size-4" /> Export {exportRows.length} data from alumni
              </button>
            </div>
          </div>
        </Modal>
      )}

      {canManage && importing && (
        <Modal title="Import alumni records" onClose={closeImport}>
          <div className="space-y-4">
            <p className="rounded-md border-l-4 border-highlight bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              Use import to add many alumni at once through a CSV file instead of encoding each
              record manually. All five registration phases are written to the database.
            </p>

            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                Instructions
              </p>
              <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>1. Download the official AlumTrack CSV template below.</li>
                <li>2. Fill in one row per alumnus. The template covers all five phases:</li>
              </ol>
              <ul className="mt-1.5 space-y-1 pl-4 text-xs text-muted-foreground">
                {CSV_INSTRUCTIONS.map((item) => (
                  <li key={item.phase}>
                    <span className="font-semibold text-foreground">{item.phase}</span> —{" "}
                    {item.detail}
                  </li>
                ))}
              </ul>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>
                  • Imported rows are marked{" "}
                  <span className="font-semibold text-foreground">verified</span> and can sign in
                  with the default password{" "}
                  <span className="font-semibold text-foreground">Alumtrack2026!</span>.
                </li>
                <li>
                  • Dates accept DD-MM-YYYY or YYYY-MM-DD. Last Name and First Name are required;
                  blank optional phases are skipped.
                </li>
                <li>
                  • Headers are matched automatically, so variants such as “Course” or “Contact
                  Number” also work. Rows with an existing email are updated instead of duplicated.
                </li>
              </ul>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-brand">
                  Recommended column order
                </summary>
                <p className="mt-2 break-words rounded bg-muted/60 px-2 py-1.5 text-[11px] text-muted-foreground">
                  {CSV_COLUMNS}
                </p>
              </details>
              <button
                type="button"
                onClick={downloadImportTemplate}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                <FileSpreadsheet className="size-3.5" /> Download CSV template
              </button>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-brand">
              <Upload className="size-5 text-brand" />
              <span className="text-xs font-semibold text-foreground">
                {importFile ? "Choose a different CSV file" : "Upload CSV file"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Click to browse or drag and drop — .csv only, up to 5,000 rows.
              </span>
              <input
                key={importFile?.name ?? "empty"}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importBusy}
                onChange={(event) => {
                  void handleImportFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>

            {importFile && (
              <div className="rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-xs">
                <p className="font-semibold text-foreground">{importFile.name}</p>
                <p className="text-muted-foreground">
                  {(importFile.size / 1024).toFixed(1)} KB · about {importRowCount} data row
                  {importRowCount === 1 ? "" : "s"}
                </p>
              </div>
            )}

            {importResult && (
              <div
                role="status"
                className={`rounded-lg border px-3 py-2 text-xs ${
                  importResult.ok
                    ? "border-success/40 bg-success/10 text-foreground"
                    : "border-red-300 bg-red-50 text-red-700"
                }`}
              >
                <p className="font-semibold">{importResult.message}</p>
                {importResult.ok && (
                  <p className="mt-1 text-muted-foreground">
                    New accounts: {importResult.created} · Updated: {importResult.updated} · Rows
                    read: {importResult.totalRows}
                  </p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Rows that need attention:</p>
                    <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((message, index) => (
                        <li key={`${index}-${message}`}>{message}</li>
                      ))}
                    </ul>
                    {importResult.errors.length > 10 && (
                      <p className="mt-1">+{importResult.errors.length - 10} more…</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeImport}
                disabled={importBusy}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand disabled:opacity-50"
              >
                {importResult?.ok ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={!importFile || importBusy}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-40"
              >
                {importBusy ? "Importing…" : "Confirm import"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {canManage && open && (
        <Modal
          wide
          title={editing ? "Edit alumni record" : "Add alumni record"}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!saving) void handleSave();
            }}
          >

            <ol className="flex flex-wrap gap-1.5">
              {PHASE_STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                      i === step
                        ? "border-brand bg-brand text-brand-foreground"
                        : i < step
                          ? "border-success bg-success/10 text-success"
                          : "border-border text-muted-foreground hover:border-brand"
                    }`}
                  >
                    {i + 1}. {s}
                  </button>
                </li>
              ))}
            </ol>

            {step === 0 && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 1 — Personal details
                </p>
                <LabeledInput label="Full name" value={wizardFullName} onChange={setWizardFullName} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Gender
                    </span>
                    <select
                      value={wizardGender}
                      onChange={(e) => setWizardGender(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                      aria-label="Gender"
                    >
                      <option value="" disabled>
                        Select Gender
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </label>
                  <LabeledInput
                    label="Date of birth"
                    type="date"
                    value={wizardDob}
                    onChange={setWizardDob}
                  />
                  <LabeledInput label="Age" value={wizardAge} disabled />
                  <LabeledInput label="Ethnicity / Tribe" value={wizardEthnicity} onChange={setWizardEthnicity} placeholder="e.g. Maranao" />
                </div>
                <LabeledInput
                  label="Place of birth"
                  value={wizardBirthPlace}
                  onChange={setWizardBirthPlace}
                  placeholder="Barangay, City/Municipality, Province"
                />
                <LabeledInput label="Religious affiliation" value={wizardReligion} onChange={setWizardReligion} />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 2 — Address and contact details
                </p>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Current address
                  </p>
                  <AddressFields value={currentAddress} onChange={setCurrentAddress} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Home address
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={sameAddress}
                      onChange={(e) => {
                        setSameAddress(e.target.checked);
                        if (e.target.checked) setHomeAddress(currentAddress);
                      }}
                      className="size-4 accent-brand"
                    />
                    Same as current address
                  </label>
                  {!sameAddress && (
                    <AddressFields value={homeAddress} onChange={setHomeAddress} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Contact details
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <LabeledInput
                      label="Active mobile number"
                      value={wizardMobile}
                      onChange={setWizardMobile}
                      placeholder="09XX XXX XXXX"
                    />
                    <LabeledInput
                      label="Active email address"
                      type="email"
                      value={wizardContactEmail}
                      onChange={setWizardContactEmail}
                    />
                    <LabeledInput
                      label="Akan email address"
                      type="email"
                      value={wizardAkanEmail}
                      onChange={setWizardAkanEmail}
                      placeholder="you@msumain.edu.ph"
                    />
                    <LabeledInput
                      label="Facebook account"
                      value={wizardFacebook}
                      onChange={setWizardFacebook}
                      placeholder="facebook.com/username"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 3 — Educational background
                </p>
                <p className="text-xs text-muted-foreground">
                  Select every degree earned. Details are requested per degree.
                  Baccalaureate Degree is the primary (default) degree; Graduate and
                  Post Graduate are used only when Baccalaureate is not selected.
                  School ID No. stays here in Phase 3 only — there is no separate
                  ID Number field in Phase 1.
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DEGREE_TYPES.map((d) => (
                    <label
                      key={d}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-3 text-xs font-semibold transition-colors ${
                        degreeTypes.includes(d)
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-border text-foreground hover:border-brand"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={degreeTypes.includes(d)}
                        onChange={() => toggleDegreeType(d)}
                        className="size-4 accent-brand"
                      />
                      {d}
                    </label>
                  ))}
                </div>

                {degreeTypes.length === 0 && (
                  <p className="rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
                    Check at least one degree to continue.
                  </p>
                )}

                {DEGREE_TYPES.filter((d) => degreeTypes.includes(d)).map((d) => (
                  <div key={d} className="rounded-md border border-border p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand">{d}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <LabeledInput
                        label="School ID No."
                        value={wizardDegreeDetails[d]?.schoolIdNo ?? ""}
                        onChange={(value) => updateWizardDegree(d, "schoolIdNo", value)}
                        placeholder="e.g. 2020-30124"
                      />
                      <LabeledInput
                        label="Degree"
                        value={wizardDegreeDetails[d]?.degree ?? ""}
                        onChange={(value) => updateWizardDegree(d, "degree", value)}
                      />
                      <LabeledInput
                        label="Major"
                        value={wizardDegreeDetails[d]?.major ?? ""}
                        onChange={(value) => updateWizardDegree(d, "major", value)}
                      />
                      <LabeledInput
                        label="Name of college"
                        value={wizardDegreeDetails[d]?.college ?? ""}
                        onChange={(value) => updateWizardDegree(d, "college", value)}
                      />
                      <LabeledInput
                        label="University / school attended"
                        value={wizardDegreeDetails[d]?.school ?? ""}
                        onChange={(value) => updateWizardDegree(d, "school", value)}
                      />
                      <LabeledInput
                        label="University / school address"
                        value={wizardDegreeDetails[d]?.schoolAddress ?? ""}
                        onChange={(value) => updateWizardDegree(d, "schoolAddress", value)}
                      />
                      <LabeledInput
                        label="Date graduated"
                        type="date"
                        value={wizardDegreeDetails[d]?.graduatedOn ?? ""}
                        onChange={(value) => updateWizardDegree(d, "graduatedOn", value)}
                      />
                    </div>
                  </div>
                ))}

                <div className="rounded-md border-l-4 border-brand bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  Course, College, and Batch Year below are auto-synced from the
                  primary degree above — Baccalaureate first, then Graduate, then
                  Post Graduate. Editing either side updates the other; Batch Year is
                  the year of that Date Graduated (e.g. 2015).
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Course
                    </label>
                    <select
                      value={wizardCourse}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      {wizardCourseOptions.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      College
                    </label>
                    <select
                      value={wizardCollege}
                      onChange={(e) => handleCollegeChange(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      {wizardCollegeOptions.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Batch year
                    </label>
                    <select
                      value={wizardBatch}
                      onChange={(e) => setWizardBatch(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      {wizardBatchOptions.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Region
                    </label>
                    <select
                      value={wizardRegion}
                      onChange={(e) => setWizardRegion(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      {REGIONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 4 — Employment (optional)
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Radio
                    name="employment"
                    label="Currently unemployed"
                    checked={employed === "unemployed"}
                    onChange={() => setEmployed("unemployed")}
                  />
                  <Radio
                    name="employment"
                    label="Currently employed"
                    checked={employed === "employed"}
                    onChange={() => setEmployed("employed")}
                  />
                </div>

                {employed === "" && (
                  <p className="mt-3 rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
                    Select an employment status to continue.
                  </p>
                )}

                {employed === "employed" && (
                  <div className="mt-4 space-y-3 rounded-md border border-border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LabeledInput label="Present position / job" value={wizardPosition} onChange={setWizardPosition} />
                      <LabeledInput
                        label="Present company / agency name"
                        value={wizardCompany}
                        onChange={setWizardCompany}
                      />
                      <LabeledInput label="Company address" value={wizardCompanyAddress} onChange={setWizardCompanyAddress} />
                      <LabeledInput label="Length of employment" value={wizardLength} onChange={setWizardLength} placeholder="e.g. 3 years" />
                      <LabeledInput
                        label="Years assumed in current office / agency"
                        value={wizardYears}
                        onChange={setWizardYears}
                        placeholder="e.g. 2"
                      />
                    </div>
                    <CheckRow
                      label="Location of employment"
                      name="location"
                      options={["Local", "Abroad"]}
                      value={wizardWorkLoc}
                      onChange={setWizardWorkLoc}
                    />
                    <CheckRow
                      label="Present employment sector"
                      name="sector"
                      options={[
                        "Government",
                        "Non-Government / Private Institution",
                        "Freelance / Entrepreneurial",
                      ]}
                      value={wizardSector}
                      onChange={setWizardSector}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                  Phase 5 — Organization / group affiliation (optional)
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Radio
                    name="affiliation"
                    label="Not involved in any organization"
                    checked={affiliated === "no"}
                    onChange={() => setAffiliated("no")}
                  />
                  <Radio
                    name="affiliation"
                    label="Involved in an organization / group"
                    checked={affiliated === "yes"}
                    onChange={() => setAffiliated("yes")}
                  />
                </div>

                {affiliated === "" && (
                  <p className="mt-3 rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
                    Select an option to continue.
                  </p>
                )}

                {affiliated === "yes" && (
                  <div className="mt-4 rounded-md border border-border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LabeledInput label="Group / organization name" value={wizardOrgName} onChange={setWizardOrgName} />
                      <LabeledInput label="Group / organization address" value={wizardOrgAddress} onChange={setWizardOrgAddress} />
                      <LabeledInput label="Position" value={wizardOrgPosition} onChange={setWizardOrgPosition} />
                      <LabeledInput label="Contact no." value={wizardOrgContact} onChange={setWizardOrgContact} />
                      <LabeledInput label="Email address" type="email" value={wizardOrgEmail} onChange={setWizardOrgEmail} />
                      <LabeledInput label="Membership since" type="date" value={wizardOrgSince} onChange={setWizardOrgSince} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand disabled:opacity-40"
              >
                Back
              </button>
              {step < PHASE_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
                >
                  Next phase
                </button>
              ) : (
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </PrimaryButton>
              )}
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title="Alumni record" onClose={() => setViewing(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border-t-4 border-brand bg-card p-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                {initials(viewing.name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{viewing.name}</p>
                <p className="text-xs text-muted-foreground">ID No. {idNumber(viewing)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3 text-brand" /> {viewing.region}
                </p>
              </div>
              <span
                className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  viewing.verified
                    ? "bg-success text-success-foreground"
                    : "bg-highlight text-highlight-foreground"
                }`}
              >
                {viewing.verified
                  ? "Verified"
                  : viewing.verificationStatus === "rejected"
                    ? "Rejected"
                    : "For verification"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Batch", value: viewing.batch },
                { label: "Degrees", value: String(viewing.education.length) },
                { label: "Registered", value: viewing.createdAt || "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-base font-bold text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <MiniCard icon={UserRound} title="Personal details">
              <Row label="Full name" value={viewing.name} />
              <Row label="Gender" value={viewing.gender || "—"} />
              <Row label="Date of birth" value={viewing.birthDate || "—"} />
              <Row label="Age" value={viewing.age || "—"} />
              <Row label="Ethnicity / Tribe" value={viewing.ethnicity || "—"} />
              <Row label="Place of birth" value={viewing.birthPlace || "—"} />
              <Row label="Religious affiliation" value={viewing.religion || "—"} />
            </MiniCard>

            <MiniCard icon={MapPin} title="Addresses">
              <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-brand">
                Present address
              </p>
              <AddressBreakdown parts={viewing.currentAddressParts} />
              <p className="mt-3 border-t border-border pt-3 text-[11px] font-bold uppercase tracking-wide text-brand">
                Home address
              </p>
              <AddressBreakdown parts={viewing.homeAddressParts} />
            </MiniCard>

            <MiniCard icon={Phone} title="Contact details">
              <Row label="Mobile number" value={viewing.mobileNumber || "—"} />
              <Row label="Email address" value={viewing.contactEmail || viewing.email} />
              <Row label="Akan email address" value={viewing.akanEmail || "—"} />
              <Row label="Facebook account" value={viewing.facebook || "—"} />
            </MiniCard>

            <MiniCard icon={GraduationCap} title="Educational details">
              {viewing.education.length === 0 ? (
                <p className="rounded-md bg-muted px-3 py-2">No education records submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {viewing.education.map((record, index) => (
                    <div
                      key={`${record.degree}-${index}`}
                      className="rounded-md border-l-2 border-brand bg-muted/40 p-3"
                    >
                      <p className="font-semibold text-foreground">{record.degree}</p>
                      <p>{record.college || viewing.college}</p>
                      {record.schoolIdNo && <p>School ID No. {record.schoolIdNo}</p>}
                      <p>
                        Batch {viewing.batch} · {record.school}
                      </p>
                      <p className="text-[11px]">
                        {record.level}
                        {record.major ? ` · ${record.major}` : ""}
                        {record.graduatedOn ? ` · Graduated ${record.graduatedOn}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </MiniCard>

            <MiniCard icon={Briefcase} title="Employment history">
              {viewing.employment.length === 0 ? (
                <p className="rounded-md bg-muted px-3 py-2">
                  Employment status: {viewing.status}. No employment record submitted.
                </p>
              ) : (
                <div className="space-y-3">
                  {viewing.employment.map((record, index) => (
                    <div
                      key={`${record.position}-${index}`}
                      className={`rounded-md p-3 ${
                        record.isCurrent
                          ? "border-l-4 border-success bg-success/10"
                          : "border-l-2 border-border bg-muted/40"
                      }`}
                    >
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                        {record.position || "Position not provided"}
                        {record.isCurrent && (
                          <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-foreground">
                            Current job
                          </span>
                        )}
                      </p>
                      <p>{record.company || "Company not provided"}</p>
                      <p className="text-[11px]">
                        {[record.sector, record.workLocation, record.yearsInOffice]
                          .filter(Boolean)
                          .join(" · ") || "Sector and location not provided"}
                      </p>
                      {record.companyAddress && (
                        <p className="text-[11px]">{record.companyAddress}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </MiniCard>

            <MiniCard icon={Users} title="Organization / group affiliation">
              {viewing.organizations.length === 0 ? (
                <p className="rounded-md bg-muted px-3 py-2">
                  No organization or group affiliation on record.
                </p>
              ) : (
                <div className="space-y-3">
                  {viewing.organizations.map((record, index) => (
                    <div
                      key={`${record.name}-${index}`}
                      className="rounded-md border-l-4 border-success bg-success/10 p-3"
                    >
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                        {record.name}
                        <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-foreground">
                          Affiliated
                        </span>
                      </p>
                      <p>
                        {record.position || "Member"}
                        {record.memberSince ? ` · since ${record.memberSince}` : ""}
                      </p>
                      <p className="text-[11px]">
                        {[record.address, record.email].filter(Boolean).join(" · ") ||
                          "No contact details provided"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </MiniCard>

            <div className={canManage ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand"
              >
                Close
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    initWizard(viewing);
                    setEditing(viewing);
                    setViewing(null);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
                >
                  <Pencil className="size-3.5" /> Edit record
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {canManage && deleting && (
        <Modal title="Delete alumni record" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the record of{" "}
            <span className="font-semibold text-foreground">{deleting.name}</span>? This permanently
            deletes the alumni account, profile, and all related records from the database.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeleting(null)}
              disabled={busyId === deleting.id}
              className="rounded-md border border-border py-2.5 text-sm font-semibold text-foreground hover:border-brand disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleDelete(deleting)}
              disabled={busyId === deleting.id}
              className="rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
            >
              {busyId === deleting.id ? "Deleting…" : "Delete record"}
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

function MiniCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof GraduationCap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-brand" /> {title}
      </p>
      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

/** Complete address breakdown in fixed order: Country → Province → City → Barangay → Street/Block/House. */
function AddressBreakdown({ parts }: { parts: AddressInput | undefined }) {
  const rows: Array<[string, string | undefined]> = [
    ["Country", parts?.country],
    ["Province / State", parts?.province],
    ["City / Municipality", parts?.city],
    ["Subdivision / Barangay", parts?.subdivision],
    ["Street", parts?.street],
    ["Block", parts?.block],
    ["House No.", parts?.houseNo],
    ["Zip Code", parts?.zipCode],
  ];
  return (
    <>
      {rows.map(([label, value]) => (
        <Row key={label} label={label} value={value?.trim() || "—"} />
      ))}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap justify-between gap-2">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </p>
  );
}

function Radio({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
        checked
          ? "border-brand bg-brand/5 text-brand"
          : "border-border text-foreground hover:border-brand"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 accent-brand"
      />
      {label}
    </label>
  );
}

function CheckRow({ label, name, options, value, onChange }: { label: string; name: string; options: string[]; value?: string; onChange?: (value: string) => void }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-foreground hover:border-brand ${
              value === o ? "border-brand bg-brand/5 text-brand" : "border-border"
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={value === o}
              onChange={() => onChange?.(o)}
              className="size-4 accent-brand"
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
