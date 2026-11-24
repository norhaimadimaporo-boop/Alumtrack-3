import { useMemo } from "react";

import { MultiFilterSelect } from "@/components/multi-filter-select";
import { COLLEGE_OPTIONS, COURSE_OPTIONS, coursesForCollege } from "@/lib/msu-colleges";

/** Bidirectional cascading multi-select for colleges and courses. */
export function MultiCollegeCourseSelect({
  colleges,
  courses,
  onCollegesChange,
  onCoursesChange,
  stacked = false,
}: {
  colleges: string[];
  courses: string[];
  onCollegesChange: (next: string[]) => void;
  onCoursesChange: (next: string[]) => void;
  /** Keep the two controls in a single vertical column (Search Alumni sidebar). */
  stacked?: boolean;
}) {
  const courseOptions = useMemo(() => {
    if (colleges.length === 0) return COURSE_OPTIONS;
    const allowed = new Set<string>();
    for (const college of colleges) {
      for (const course of coursesForCollege(college)) allowed.add(course);
    }
    // Keep any already-selected value reachable even if it came from a legacy
    // college label that is not in the canonical dataset.
    for (const course of courses) allowed.add(course);
    return [...allowed];
  }, [colleges, courses]);

  const handleColleges = (next: string[]) => {
    onCollegesChange(next);
    const allowed = new Set<string>();
    if (next.length === 0) {
      COURSE_OPTIONS.forEach((course) => allowed.add(course));
    } else {
      next.forEach((college) =>
        coursesForCollege(college).forEach((course) => allowed.add(course)),
      );
    }
    const stillValid = courses.filter((course) => allowed.has(course));
    if (stillValid.length !== courses.length) onCoursesChange(stillValid);
  };

  return (
    <div
      className={
        stacked ? "grid min-w-0 grid-cols-1 gap-3" : "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"
      }
    >
      <MultiFilterSelect
        placeholder="All colleges"
        options={[...COLLEGE_OPTIONS]}
        value={colleges}
        onChange={handleColleges}
        allLabel="All colleges"
      />
      <MultiFilterSelect
        placeholder="All courses"
        options={courseOptions}
        value={courses}
        onChange={onCoursesChange}
        allLabel="All courses"
      />
    </div>
  );
}
