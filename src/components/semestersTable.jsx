import { useState } from "react";
import coursesData from "../data/courses.json";

function SemestersTable({ semesters, onCourseSelect }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const courseOptions = coursesData.courses.map((course) => course.id);

  function handleSlotClick(semesterIndex, courseIndex) {
    setSelectedSlot({ semesterIndex, courseIndex });
  }

  function handleCourseChange(event) {
  if (!selectedSlot) return;

  const newCourse = event.target.value;
  if (!newCourse) return;

  let chosenCourse = newCourse;

  if (newCourse === "__CUSTOM__") {
    const customCourse = prompt("Enter a custom course, like ENG-101:");
    if (!customCourse) {
      setSelectedSlot(null);
      return;
    }
    chosenCourse = customCourse.toUpperCase();
  }

  const wasPlaced = onCourseSelect(
    selectedSlot.semesterIndex,
    selectedSlot.courseIndex,
    chosenCourse,
  );

  if (wasPlaced) {
    setSelectedSlot(null);
  }
}

  return (
    <div>
      <h2 style={{ color: "black" }}>8 Semester Plan</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginTop: "20px",
        }}
      >
        {semesters.map((semester, semesterIndex) => (
          <div
            key={semester.name}
            style={{
              border: "2px solid #cc0033",
              borderRadius: "10px",
              padding: "16px",
              backgroundColor: "white",
              minHeight: "220px",
              color: "black",
            }}
          >
            <h3>{semester.name}</h3>

            {semester.courses.map((course, index) => {
              const isSelected =
                selectedSlot &&
                selectedSlot.semesterIndex === semesterIndex &&
                selectedSlot.courseIndex === index;

              return (
                <div key={index} style={{ marginBottom: "8px" }}>
                  {isSelected ? (
                    <select
                      autoFocus
                      onChange={handleCourseChange}
                      defaultValue=""
                      style={{
                        width: "100%",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "8px",
                        backgroundColor: "#f9f9f9",
                        color: "black",
                      }}
                    >
                      <option value="">Select a course</option>
                      {courseOptions.map((courseOption) => (
                        <option key={courseOption} value={courseOption}>
                          {courseOption}
                        </option>
                      ))}
                      <option value="__CUSTOM__">Custom course...</option>
                    </select>
                  ) : (
                    <div
                      onClick={() => handleSlotClick(semesterIndex, index)}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "8px",
                        backgroundColor: "#f9f9f9",
                        color: "black",
                        cursor: "pointer",
                      }}
                    >
                      {course || "+ Add course"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SemestersTable;