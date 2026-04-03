import "./App.css";
import { useState } from "react";
import SemestersTable from "./components/semestersTable.jsx";
import MajorRequirements from "./components/major_requirements.jsx";
import coursesData from "./data/courses.json";
import majorRequirements from "./data/major_requirements.json";

function App() {
  const initialSemesters = [
    { name: "Fall 1st Year", courses: [null, null, null, null] },
    { name: "Spring 1st Year", courses: [null, null, null, null] },
    { name: "Fall 2nd Year", courses: [null, null, null, null] },
    { name: "Spring 2nd Year", courses: [null, null, null, null] },
    { name: "Fall 3rd Year", courses: [null, null, null, null] },
    { name: "Spring 3rd Year", courses: [null, null, null, null] },
    { name: "Fall 4th Year", courses: [null, null, null, null] },
    { name: "Spring 4th Year", courses: [null, null, null, null] },
  ];

  function getFreshSemesters() {
    return initialSemesters.map((semester) => ({
      ...semester,
      courses: [...semester.courses],
    }));
  }

  const [semesters, setSemesters] = useState(getFreshSemesters());
  const [warningMessage, setWarningMessage] = useState("");

  function normalizeCourse(course) {
    return course ? course.toUpperCase().replaceAll("-", "") : "";
  }

  function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  const courseMap = {};
  for (const course of coursesData.courses) {
    courseMap[normalizeCourse(course.code)] = course;
    courseMap[normalizeCourse(course.id)] = course;
  }

  function getTermFromSemesterName(name) {
    return name.includes("Fall") ? "Fall" : "Spring";
  }

  function getCompletedBeforeSemester(plan, semesterIndex) {
    const completed = new Set();

    for (let i = 0; i < semesterIndex; i++) {
      for (const course of plan[i].courses) {
        if (course) {
          completed.add(normalizeCourse(course));
        }
      }
    }

    return completed;
  }

  function countCSCoursesInSemester(semester) {
    return semester.courses.filter(
      (course) => course && normalizeCourse(course).startsWith("CSC"),
    ).length;
  }

  function isCourseAlreadyPlanned(plan, code) {
    const normalized = normalizeCourse(code);

    return plan.some((semester) =>
      semester.courses.some(
        (course) => course && normalizeCourse(course) === normalized,
      ),
    );
  }

  function canPlaceCourse(plan, semesterIndex, code) {
    const normalizedCode = normalizeCourse(code);
    const course = courseMap[normalizedCode];
    if (!course) return false;

    const term = getTermFromSemesterName(plan[semesterIndex].name);
    const completedBefore = getCompletedBeforeSemester(plan, semesterIndex);
    const cscCount = countCSCoursesInSemester(plan[semesterIndex]);

    if (isCourseAlreadyPlanned(plan, normalizedCode)) return false;
    if (course.offered && !course.offered.includes(term)) return false;

    const isFirstTwoYears = semesterIndex <= 3;
    const currentSemesterCourses = plan[semesterIndex].courses
      .filter(Boolean)
      .map(normalizeCourse);

    const currentCSCourses = currentSemesterCourses.filter((course) =>
      course.startsWith("CSC"),
    );

    if (normalizedCode.startsWith("CSC")) {
      if (isFirstTwoYears) {
        const has208Already = currentCSCourses.includes("CSC208");
        const isAdding208 = normalizedCode === "CSC208";

        if (has208Already || isAdding208) {
          if (currentCSCourses.length >= 2) {
            return false;
          }
        } else {
          if (currentCSCourses.length >= 1) {
            return false;
          }
        }
      } else {
        if (cscCount >= 2) {
          return false;
        }
      }
    }
    const prereqs = course.prerequisites || [];
    for (const prereq of prereqs) {
      if (prereq === "NONE") continue;
      if (!completedBefore.has(normalizeCourse(prereq))) {
        return false;
      }
    }

    return true;
  }

  function getPlacementError(plan, semesterIndex, code) {
      const normalizedCode = normalizeCourse(code);
      const course = courseMap[normalizedCode];

      if (!course) return "";

      const term = getTermFromSemesterName(plan[semesterIndex].name);
      const completedBefore = getCompletedBeforeSemester(plan, semesterIndex);

      if (isCourseAlreadyPlanned(plan, normalizedCode)) {
        return `${course.id} is already in the plan.`;
      }

      if (course.offered && !course.offered.includes(term)) {
        return `${course.id} is not offered in ${term}.`;
      }

      const prereqs = course.prerequisites || [];
      for (const prereq of prereqs) {
        if (prereq === "NONE") continue;
        if (!completedBefore.has(normalizeCourse(prereq))) {
          return `${course.id} cannot be taken before ${prereq}.`;
        }
      }

      return "";
    }

    function handleManualCourseSelect(semesterIndex, courseIndex, newCourse) {
      const updated = semesters.map((semester) => ({
        ...semester,
        courses: [...semester.courses],
      }));

      updated[semesterIndex].courses[courseIndex] = null;

      const normalized = normalizeCourse(newCourse);
      const knownCourse = courseMap[normalized];

      if (knownCourse) {
        const error = getPlacementError(updated, semesterIndex, normalized);

        if (error) {
          setWarningMessage(error);
          return false;
        }
      }

      updated[semesterIndex].courses[courseIndex] = newCourse.toUpperCase();
      setSemesters(updated);
      setWarningMessage("");
      return true;
    }

    function resetPlan() {
      setSemesters(getFreshSemesters());
      setWarningMessage("");
    }

  function getValidElectives(alreadyTaken) {
    const electiveReq = majorRequirements.requirements.electives;

    return coursesData.courses.filter((course) => {
      const normalized = normalizeCourse(course.code);
      const number = parseInt(normalized.replace(/\D/g, ""), 10);

      if (alreadyTaken.has(normalized)) return false;

      const hasAllowedPrefix = electiveReq.allowedPrefixes.some((prefix) =>
        normalized.startsWith(prefix),
      );
      if (!hasAllowedPrefix) return false;

      if (number < electiveReq.minLevel) return false;

      const excluded = electiveReq.excludedCourses.map(normalizeCourse);
      if (excluded.includes(normalized)) return false;

      return true;
    });
  }

  function buildRemainingRequirements(alreadyTaken) {
    const reqs = majorRequirements.requirements;
    const remainingSingles = [];
    const remainingGroups = [];

    for (const [category, value] of Object.entries(reqs)) {
      if (category === "electives") continue;
      if (!Array.isArray(value)) continue;

      const normalizedValues = value.map(normalizeCourse);

      const isOneOfCategory =
        category.toLowerCase().includes("one of") || category === "Systems";

      if (isOneOfCategory) {
        const alreadySatisfied = normalizedValues.some((code) =>
          alreadyTaken.has(code),
        );

        if (!alreadySatisfied) {
          remainingGroups.push(normalizedValues);
        }
      } else {
        for (const code of normalizedValues) {
          if (!alreadyTaken.has(code)) {
            remainingSingles.push(code);
          }
        }
      }
    }

    return { remainingSingles, remainingGroups };
  }

  function autoFillPlan() {
    const updated = semesters.map((semester) => ({
      ...semester,
      courses: [...semester.courses],
    }));

    function getValidMathElectives(alreadyTaken) {
      const mathReq = majorRequirements.requirements["Math Elective"];
      if (!mathReq) return [];

      return coursesData.courses.filter((course) => {
        const normalized = normalizeCourse(course.code);

        if (alreadyTaken.has(normalized)) return false;

        const hasAllowedPrefix = mathReq.allowedPrefixes.some((prefix) =>
          normalized.startsWith(prefix),
        );
        if (!hasAllowedPrefix) return false;

        const match = normalized.match(/\d+/);
        const courseNumber = match ? parseInt(match[0], 10) : 0;
        if (courseNumber < mathReq.minNumber) return false;

        const excluded = (mathReq.excludedCourses || []).map(normalizeCourse);
        if (excluded.includes(normalized)) return false;

        return true;
      });
    }

    const alreadyTaken = new Set(
      updated
        .flatMap((semester) => semester.courses)
        .filter(Boolean)
        .map(normalizeCourse),
    );

    const { remainingSingles, remainingGroups } =
      buildRemainingRequirements(alreadyTaken);

    let electivePool = getValidElectives(alreadyTaken);
    let mathElectivePool = getValidMathElectives(alreadyTaken);
    let mathElectiveNeeded = !!majorRequirements.requirements["Math Elective"];

    for (
      let semesterIndex = 0;
      semesterIndex < updated.length;
      semesterIndex++
    ) {
      for (
        let slotIndex = 0;
        slotIndex < updated[semesterIndex].courses.length;
        slotIndex++
      ) {
        if (updated[semesterIndex].courses[slotIndex]) continue;

        const validOptions = [];

        for (const code of remainingSingles) {
          if (canPlaceCourse(updated, semesterIndex, code)) {
            validOptions.push({ type: "single", code });
          }
        }

        for (
          let groupIndex = 0;
          groupIndex < remainingGroups.length;
          groupIndex++
        ) {
          for (const code of remainingGroups[groupIndex]) {
            if (canPlaceCourse(updated, semesterIndex, code)) {
              validOptions.push({ type: "group", code, groupIndex });
            }
          }
        }

        if (validOptions.length > 0) {
          const choice = getRandomItem(validOptions);
          updated[semesterIndex].courses[slotIndex] = courseMap[choice.code].id;

          if (choice.type === "single") {
            const indexToRemove = remainingSingles.indexOf(choice.code);
            if (indexToRemove !== -1) {
              remainingSingles.splice(indexToRemove, 1);
            }
          } else {
            remainingGroups.splice(choice.groupIndex, 1);
          }

          continue;
        }

        const electives = electivePool.filter((course) =>
          canPlaceCourse(updated, semesterIndex, course.code),
        );

        if (electives.length > 0) {
          const choice = getRandomItem(electives);
          updated[semesterIndex].courses[slotIndex] = choice.id;

          const indexToRemove = electivePool.findIndex(
            (course) =>
              normalizeCourse(course.code) === normalizeCourse(choice.code),
          );

          if (indexToRemove !== -1) {
            electivePool.splice(indexToRemove, 1);
          }
        }
      }
    }

    setSemesters(updated);
  }

  return (
    <div className="app">
      <h1 style={{ color: "black" }}>Grinnell 4-Year Planner</h1>
      <p style={{ color: "black", marginTop: "10px" }}>
        Click any course slot to enter a class and see degree requirements
        update automatically.
      </p>

     <div
  style={{
    marginTop: "20px",
    marginBottom: "20px",
    display: "flex",
    gap: "12px",
  }}
>
  <button
    onClick={autoFillPlan}
    style={{
      padding: "12px 20px",
      backgroundColor: "#cc0033",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "16px",
    }}
  >
    Auto-Fill Remaining Plan
  </button>

  <button
    onClick={resetPlan}
    style={{
      padding: "12px 20px",
      backgroundColor: "#666",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "16px",
    }}
  >
    Reset Plan
  </button>
</div>

      {warningMessage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffe69c",
            color: "#856404",
            fontWeight: "500",
          }}
        >
          {warningMessage}
        </div>
      )}

      <SemestersTable
        semesters={semesters}
        onCourseSelect={handleManualCourseSelect}
      />
      <MajorRequirements semesters={semesters} />
    </div>
  );
}

export default App;
