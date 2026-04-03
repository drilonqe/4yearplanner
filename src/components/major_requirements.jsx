import majorRequirements from "../data/major_requirements.json";
import coursesData from "../data/courses.json";

function MajorRequirements({ semesters }) {
  const reqs = majorRequirements.requirements;

  function normalizeCourse(course) {
    return course ? course.toUpperCase().replaceAll("-", "") : "";
  }

  const allCourses = semesters
    .flatMap((semester) => semester.courses)
    .filter(Boolean)
    .map(normalizeCourse);

  const courseMap = {};
  for (const course of coursesData.courses) {
    courseMap[normalizeCourse(course.code)] = course;
    courseMap[normalizeCourse(course.id)] = course;
  }

  function getSatisfiedCourse(category, value) {
    if (!Array.isArray(value)) {
      if (value.type === "level-based") {
        return (
          allCourses.find(
            (course) =>
              course.startsWith(value.prefix) &&
             getCourseLevelNumber(course) >= value.minLevel,
          ) || null
        );
      }

      return null;
    }

    const matches = value.filter((course) =>
      allCourses.includes(normalizeCourse(course)),
    );

    if (category === "Discrete Structures (one of)" || category === "Systems") {
      return matches[0] || null;
    }

    return matches.length === value.length ? matches : null;
  }

  function isRequirementMet(category, value) {
    if (!Array.isArray(value)) {
      if (value.type === "level-based") {
        return allCourses.some(
          (course) =>
            course.startsWith(value.prefix) &&
            getCourseLevelNumber(course) >= value.minLevel,
        );
      }

      return false;
    }

    if (category === "Discrete Structures (one of)" || category === "Systems") {
      return value.some((course) =>
        allCourses.includes(normalizeCourse(course)),
      );
    }

    return value.every((course) =>
      allCourses.includes(normalizeCourse(course)),
    );
  }

  function getUsedRequirementCourses() {
    const used = new Set();

    for (const [category, value] of Object.entries(reqs)) {
      if (!Array.isArray(value)) continue;

      if (
        category === "Discrete Structures (one of)" ||
        category === "Systems"
      ) {
        const chosen = value.find((course) =>
          allCourses.includes(normalizeCourse(course)),
        );
        if (chosen) used.add(normalizeCourse(chosen));
      } else {
        for (const course of value) {
          if (allCourses.includes(normalizeCourse(course))) {
            used.add(normalizeCourse(course));
          }
        }
      }
    }

    return used;
  }

  function getCourseLevelNumber(code) {
    const normalized = normalizeCourse(code);
    const match = normalized.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function getElectivesStatus() {
    const electiveReq = reqs.electives;
    const usedRequirementCourses = getUsedRequirementCourses();


    const takenCourseObjects = allCourses
      .map((code) => courseMap[code])
      .filter(Boolean);

    const validElectives = [];
    const countedCodes = new Set();

    for (const course of takenCourseObjects) {
      const normalized = normalizeCourse(course.code);

      if (countedCodes.has(normalized)) continue;

      const allowedPrefix = electiveReq.allowedPrefixes.some((prefix) =>
        normalized.startsWith(prefix),
      );

      const meetsLevel =
        getCourseLevelNumber(normalized) >= electiveReq.minLevel;

      const isExcluded = electiveReq.excludedCourses
        .map(normalizeCourse)
        .includes(normalized);

      const alreadyUsedForRequirement = usedRequirementCourses.has(normalized);

      if (
        allowedPrefix &&
        meetsLevel &&
        !isExcluded &&
        !alreadyUsedForRequirement
      ) {
        validElectives.push(course);
        countedCodes.add(normalized);
      }
    }

    // Special rule: if both CSC211 and CSC213 are taken,
    // one satisfies Systems and the other may count as an elective.
    const systemsTaken = ["CSC211", "CSC213"].filter((code) =>
      allCourses.includes(normalizeCourse(code)),
    );

    if (systemsTaken.length === 2) {
      const systemsUsed = Array.from(usedRequirementCourses).find(
        (code) => code === "CSC211" || code === "CSC213",
      );

      const extraSystemsCourse = systemsTaken.find(
        (code) => normalizeCourse(code) !== systemsUsed,
      );

      if (
        extraSystemsCourse &&
        !countedCodes.has(normalizeCourse(extraSystemsCourse))
      ) {
        const extraCourseObj = courseMap[normalizeCourse(extraSystemsCourse)];
        if (extraCourseObj) {
          validElectives.push(extraCourseObj);
          countedCodes.add(normalizeCourse(extraSystemsCourse));
        }
      }
    }

    let totalCredits = 0;
    const usedElectives = [];

    for (const course of validElectives) {
      let creditsToAdd = course.credits || 0;
      const normalized = normalizeCourse(course.code);

      if (
        normalized === "CSC326" &&
        electiveReq.specialRules?.CSC326?.maxCredits !== undefined
      ) {
        creditsToAdd = Math.min(
          creditsToAdd,
          electiveReq.specialRules.CSC326.maxCredits,
        );
      }

      totalCredits += creditsToAdd;
      usedElectives.push({
        code: normalizeCourse(course.code),
        name: course.name,
        creditsCounted: creditsToAdd,
      });
    }

    return {
      completed: totalCredits >= electiveReq.credits,
      totalCredits,
      neededCredits: electiveReq.credits,
      usedElectives,
    };
  }

  const electivesStatus = getElectivesStatus();

  return (
    <div style={{ marginTop: "40px", color: "black" }}>
      <h2 style={{ color: "black" }}>Computer Science Major Requirements</h2>
      <p>{majorRequirements.major.description}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginTop: "20px",
          textAlign: "left",
        }}
      >
        {Object.entries(reqs).map(([category, value]) => {
          const satisfied = getSatisfiedCourse(category, value);
          const completed =
            category === "electives" ? electivesStatus.completed : !!satisfied;

          return (
            <div
              key={category}
              style={{
                border: "2px solid #cc0033",
                borderRadius: "10px",
                padding: "16px",
                backgroundColor: completed ? "#d4edda" : "#f8d7da",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{category}</h3>

              {Array.isArray(value) || value.type === "level-based" ? (
                <>
                  {Array.isArray(value) ? (
                    <ul>
                      {value.map((course) => (
                        <li key={course}>{course}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Any {value.prefix} course at level {value.minLevel} or
                      above
                    </p>
                  )}
                  <p>
                    <strong>Status:</strong>{" "}
                    {completed ? " Completed" : " Not completed"}
                  </p>

                  {completed && (
                    <p>
                      <strong>Used:</strong>{" "}
                      {Array.isArray(satisfied)
                        ? satisfied.join(", ")
                        : satisfied}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>
                    <strong>Needed:</strong> {electivesStatus.neededCredits}{" "}
                    elective credits
                  </p>
                  <p>
                    <strong>Counted so far:</strong>{" "}
                    {electivesStatus.totalCredits}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {electivesStatus.completed
                      ? " Completed"
                      : "Not completed"}
                  </p>

                  <div>
                    <strong>Courses counting toward electives:</strong>
                    {electivesStatus.usedElectives.length > 0 ? (
                      <ul>
                        {electivesStatus.usedElectives.map((course) => (
                          <li key={course.code}>
                            {course.code} ({course.creditsCounted} credits)
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No elective courses counted yet.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MajorRequirements;
